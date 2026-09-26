import { useQueryClient } from "@tanstack/solid-query";
import type {
	AgentContext,
	AgentConversation,
	AgentDelivery,
	AgentInput,
	AgentInputAction,
	AgentMessage,
	ResponseBody,
} from "@types";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	untrack,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import {
	answerQuestion,
	applyStreamEvent,
	awaitsDelivery,
	findPendingQuestion,
	isRunWorking,
} from "@/utils/agent-chat";

/**
 * Loads a conversation and streams the agent's replies over its saved history.
 * Leaving mid-reply lets the run finish in the background; while it does, the
 * chat watches the run's saved replies until it stops. Messages sent while the
 * agent is busy queue on the server, so they are delivered even if the chat is
 * closed.
 */
export const useAgentChat = (conversationId: Accessor<string | undefined>) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [live, setLive] = createSignal<AgentMessage[]>();
	const [liveRunId, setLiveRunId] = createSignal<string>();
	const [error, setError] = createSignal<string>();
	const [liveContext, setLiveContext] = createSignal<AgentContext>();
	//* reconciled so streamed updates patch rendered rows instead of remounting them
	const [inputs, setInputs] = createStore<AgentInput[]>([]);
	const [messages, setMessages] = createStore<AgentMessage[]>([]);
	//* a failed submission keeps its request id, so resending it cannot create a duplicate
	let retrySubmission:
		| { text: string; delivery: AgentDelivery; requestId: string }
		| undefined;
	let controller: AbortController | undefined;
	const streaming = createMemo(() => live() !== undefined);

	// ----------------------------------------
	// Queries & Mutations
	const conversation = api.agent.useGetConversation({
		id: conversationId,
		poll: (data) => !untrack(streaming) && awaitsDelivery(data),
	});
	const latestRun = createMemo(() => conversation.data?.data.latestRun);
	const background = createMemo(
		() => !streaming() && isRunWorking(latestRun()?.status),
	);
	const history = api.agent.useGetMessages({ id: conversationId });
	const cancelRun = api.agent.useCancelRun();

	// ----------------------------------------
	// Memos
	const saved = createMemo(() =>
		(history.data?.pages ?? []).toReversed().flatMap((page) => page.data),
	);
	const pendingQuestion = createMemo(() =>
		latestRun()?.status === "waiting" && !streaming()
			? findPendingQuestion(saved(), latestRun()?.id)
			: undefined,
	);
	const activeRunId = createMemo(
		() =>
			liveRunId() ??
			(isRunWorking(latestRun()?.status) || latestRun()?.status === "waiting"
				? latestRun()?.id
				: undefined),
	);

	// ----------------------------------------
	// Functions
	//* the list key prefixes the conversation and message keys, so this refreshes all three
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.agent.conversations(),
		});
	const refreshConversation = (id: string) =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.agent.conversation(id),
			exact: true,
		});
	/** Applies a change to the cached conversation, so the chat updates before the server confirms it. */
	const patchConversation = (
		id: string,
		patch: (conversation: AgentConversation) => AgentConversation,
	) =>
		queryClient.setQueryData<ResponseBody<AgentConversation>>(
			queryKeys.agent.conversation(id),
			(response) =>
				response ? { ...response, data: patch(response.data) } : response,
		);
	const failed = (cause: unknown) => {
		setError(
			cause instanceof Error ? cause.message : T()("agent.errors.stream"),
		);
		return false;
	};

	/** Opens a run stream. Resolves once the server accepts it; the reply keeps streaming after. */
	const stream = (
		url: string,
		options: {
			body?: Record<string, unknown>;
			prepare?: (messages: AgentMessage[]) => AgentMessage[];
		} = {},
	) => {
		const id = conversationId();
		if (!id || streaming()) return Promise.resolve(false);
		const accepted = Promise.withResolvers<boolean>();
		const current = new AbortController();
		let started = false;
		controller = current;
		setError(undefined);
		setLive(options.prepare?.(saved()) ?? saved());

		void (async () => {
			try {
				await api.agent.streamRun({
					url,
					body: options.body,
					signal: current.signal,
					onAccepted: () => accepted.resolve(true),
					onEvent: (event) => {
						switch (event.type) {
							case "error":
								setError(event.message);
								return;
							case "context":
								//* a finished compaction adds a marker to the conversation
								if (
									untrack(liveContext)?.status === "compacting" &&
									event.context.status === "ready"
								) {
									void refreshConversation(id);
								}
								setLiveRunId(event.runId);
								setLiveContext(event.context);
								return;
							case "inputs":
								patchConversation(id, (data) => ({
									...data,
									inputs: event.inputs,
									queuePaused: event.queuePaused,
								}));
								return;
							case "next":
								//* the chat starts watching the queued run as soon as this stream ends
								patchConversation(id, (data) => ({
									...data,
									latestRun: {
										id: event.runId,
										status: "queued",
										outcome: null,
										errorMessage: null,
									},
								}));
								return;
							case "start":
								if (started) break;
								started = true;
								setLiveRunId(event.runId);
								//* the first message names the chat
								void refreshConversation(id);
								break;
						}
						setLive((messages) => applyStreamEvent(messages ?? [], event, id));
					},
				});
			} catch (cause) {
				if (!current.signal.aborted) failed(cause);
			} finally {
				accepted.resolve(false);
				await refresh();
				if (controller === current) {
					controller = undefined;
					setLive(undefined);
					setLiveRunId(undefined);
					setLiveContext(undefined);
				}
			}
		})();

		return accepted.promise;
	};

	/** Queues input on the server. The row appears straight away and is removed if the server refuses it. */
	const submit = async (
		id: string,
		pending: { text: string; delivery: AgentDelivery; requestId: string },
	) => {
		setError(undefined);
		patchConversation(id, (data) => ({
			...data,
			inputs: [
				...(data.inputs ?? []).filter(
					(input) => input.id !== pending.requestId,
				),
				{
					id: pending.requestId,
					text: pending.text,
					status: "pending",
					delivery: pending.delivery,
				},
			],
		}));
		try {
			await api.agent.submitInput({ conversationId: id, ...pending });
			await refreshConversation(id);
			return true;
		} catch (cause) {
			patchConversation(id, (data) => ({
				...data,
				inputs: data.inputs?.filter((input) => input.id !== pending.requestId),
			}));
			return failed(cause);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() =>
		setInputs(reconcile(conversation.data?.data.inputs ?? [], { key: "id" })),
	);
	createEffect(() => setMessages(reconcile(live() ?? saved(), { key: "id" })));
	createEffect(
		on(
			conversationId,
			() => {
				controller?.abort();
				retrySubmission = undefined;
				setError(undefined);
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			() => background() && history.isSuccess,
			(watch) => {
				//* a failed watch waits for the next message rather than retrying in a loop
				const run = latestRun();
				if (!watch || !run || untrack(error)) return;
				void stream(`/lucid/api/v1/agent/runs/${run.id}/events`);
			},
		),
	);
	//* a background run can finish between fetches, before a watch stream opens
	createEffect(
		on(
			[() => latestRun()?.id, () => latestRun()?.status],
			() => {
				if (!untrack(streaming))
					void queryClient.invalidateQueries({
						queryKey: queryKeys.agent.messages(conversationId()),
					});
			},
			{ defer: true },
		),
	);
	onCleanup(() => controller?.abort());

	// ----------------------------------------
	// Return
	return {
		conversation,
		context: createMemo(() => liveContext() ?? conversation.data?.data.context),
		compactions: createMemo(() => conversation.data?.data.compactions ?? []),
		compact: () =>
			stream(`/lucid/api/v1/agent/conversations/${conversationId()}/compact`, {
				body: { requestId: crypto.randomUUID() },
			}),
		history,
		messages,
		pendingQuestion,
		activeRunId,
		error,
		streaming,
		/** True while the agent is replying here or in the background. */
		working: createMemo(() => streaming() || background()),
		inputs,
		queuePaused: createMemo(() => conversation.data?.data.queuePaused ?? false),
		/** Sends a message. While the agent is busy it queues, or steers the current run. */
		send: async (text: string, mode: "send" | "steer" = "send") => {
			const id = conversationId();
			if (!id) return false;
			const targetRunId = activeRunId();
			const delivery: AgentDelivery =
				mode === "steer" && targetRunId
					? { kind: "steer", targetRunId }
					: { kind: "queue" };
			const pending =
				retrySubmission?.text === text &&
				JSON.stringify(retrySubmission.delivery) === JSON.stringify(delivery)
					? retrySubmission
					: { text, delivery, requestId: crypto.randomUUID() };
			retrySubmission = pending;

			//* anything the server may still be delivering goes through the queue, to keep order
			const queued =
				streaming() ||
				background() ||
				pendingQuestion() !== undefined ||
				conversation.data?.data.queuePaused ||
				(conversation.data?.data.inputs?.length ?? 0) > 0;
			const accepted = queued
				? await submit(id, pending)
				: await stream(`/lucid/api/v1/agent/conversations/${id}/messages`, {
						body: pending,
						prepare: (messages) => [
							...messages,
							{
								id: pending.requestId,
								conversationId: id,
								runId: pending.requestId,
								role: "user",
								position: (messages.at(-1)?.position ?? 0) + 1,
								parts: [{ type: "text", text }],
								createdAt: new Date().toISOString(),
							},
						],
					});
			if (accepted && retrySubmission === pending) retrySubmission = undefined;
			return accepted;
		},
		respond: (question: { runId: string; id: string }, answer: string) =>
			stream(`/lucid/api/v1/agent/runs/${question.runId}/respond`, {
				body: { questionId: question.id, answer },
				prepare: (messages) => answerQuestion(messages, question.id, answer),
			}),
		/** Changes pending input. The row changes straight away and is corrected if the server refuses. */
		updateInput: async (action: AgentInputAction) => {
			const id = conversationId();
			if (!id) return false;
			setError(undefined);
			patchConversation(id, (data) => ({
				...data,
				queuePaused:
					action.kind === "resume" || action.kind === "clear"
						? false
						: data.queuePaused,
				inputs: data.inputs?.flatMap((input) => {
					if (action.kind === "clear") return [];
					if (!("id" in action) || input.id !== action.id) return [input];
					if (action.kind === "cancel") return [];
					return [
						{
							...input,
							delivery: { kind: "steer", targetRunId: action.targetRunId },
						},
					];
				}),
			}));
			try {
				await api.agent.updateInput({ conversationId: id, action });
				await refreshConversation(id);
				return true;
			} catch (cause) {
				await refreshConversation(id);
				return failed(cause);
			}
		},
		/** Cancels the run rather than leaving it to finish in the background. */
		stop: async () => {
			const id = liveRunId() ?? latestRun()?.id;
			try {
				if (id) await cancelRun.action.mutateAsync({ id });
			} finally {
				controller?.abort();
			}
		},
	};
};

export default useAgentChat;

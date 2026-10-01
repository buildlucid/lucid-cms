import { useQueryClient } from "@tanstack/solid-query";
import type {
	AgentContext,
	AgentConversation,
	AgentDelivery,
	AgentInput,
	AgentInputAction,
	AgentInteractionAction,
	AgentMessage,
	AgentReferenceInput,
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
import { createStore, reconcile, unwrap } from "solid-js/store";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import {
	awaitsDelivery,
	completedTools,
	createAgentMessages,
	findPendingInteraction,
	isRunWorking,
	settlesInteraction,
	shouldPollTitle,
} from "@/utils/agent-chat";
import {
	type AgentReferenceItem,
	agentReferenceInput,
} from "@/utils/agent-references";
import {
	analyzeMediaTool,
	previewMediaTool,
	readFileTool,
	registerReferencesTool,
	removeReferenceTool,
	webFetchTool,
	webSearchTool,
} from "@/utils/agent-tools";

/** Input the server has not yet accepted, kept so a retry reuses its request ID. */
type PendingSubmission = {
	text: string;
	references: AgentReferenceInput[];
	delivery: AgentDelivery;
	requestId: string;
};

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
	const [streaming, setStreaming] = createSignal(false);
	const [responding, setResponding] = createSignal(false);
	const [liveRunId, setLiveRunId] = createSignal<string>();
	const [error, setError] = createSignal<string>();
	const [liveContext, setLiveContext] = createSignal<AgentContext>();
	//* reconciled so streamed updates patch rendered rows instead of remounting them
	const [inputs, setInputs] = createStore<AgentInput[]>([]);
	const transcript = createAgentMessages();
	const messages = transcript.messages;
	//* a failed submission keeps its request id, so resending it cannot create a duplicate
	let retrySubmission: PendingSubmission | undefined;
	let controller: AbortController | undefined;

	// ----------------------------------------
	// Queries & Mutations
	const conversation = api.agent.useGetConversation({
		id: conversationId,
		poll: (data) => {
			if (!untrack(streaming) && awaitsDelivery(data)) return 1_000;
			return shouldPollTitle(data) ? 4_000 : false;
		},
	});
	const data = createMemo(() =>
		conversation.isSuccess ? conversation.data?.data : undefined,
	);
	const latestRun = createMemo(() => data()?.latestRun);
	const background = createMemo(
		() => !streaming() && isRunWorking(latestRun()?.status),
	);
	const messageHistory = api.agent.useGetMessages({ id: conversationId });
	const history = messageHistory.query;
	const cancelRun = api.agent.useCancelRun();

	// ----------------------------------------
	// Memos
	const saved = createMemo(() =>
		(history.isSuccess ? history.data.pages : [])
			.toReversed()
			.flatMap((page) => page.data),
	);
	const pendingInteraction = createMemo(() =>
		latestRun()?.status === "waiting" && (!streaming() || responding())
			? findPendingInteraction(messages, latestRun()?.id)
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
	const refreshConversation = (id: string) =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.agent.conversation(id),
			exact: true,
		});
	//* not exact, so media previews resolved from the references refresh with them
	const refreshReferences = (id: string) =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.agent.references(id),
		});
	const refreshDetails = (id: string) =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.agent.conversationDetails(id),
			exact: true,
		});
	/** Tools that change references or web sources refresh them during the run. */
	const refreshAfterTool = (id: string, name: string) => {
		if (
			name === previewMediaTool ||
			name === registerReferencesTool ||
			name === removeReferenceTool ||
			name === analyzeMediaTool ||
			name === readFileTool
		) {
			void refreshReferences(id);
		}
		if (name === webSearchTool || name === webFetchTool) {
			void refreshDetails(id);
		}
	};
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

	/** Opens a run stream at a URL for this conversation. Resolves once the server accepts it; the reply keeps streaming after. */
	const stream = (
		url: (conversationId: string) => string,
		options: {
			body?: Record<string, unknown>;
			prepare?: (messages: AgentMessage[]) => AgentMessage[];
			interactionId?: string;
		} = {},
	) => {
		const id = conversationId();
		if (!id || streaming()) return Promise.resolve(false);

		const accepted = Promise.withResolvers<boolean>();
		const current = new AbortController();
		const refreshedTools = new Set<string>();
		const referencedMessages = new Set<string>();
		let started = false;
		let connected = false;

		controller = current;
		setError(undefined);
		setStreaming(true);
		transcript.replace(options.prepare?.(saved()) ?? saved());

		void (async () => {
			try {
				await api.agent.streamRun({
					url: url(id),
					body: options.body,
					signal: current.signal,
					onAccepted: () => {
						connected = true;
						if (!options.interactionId) accepted.resolve(true);
					},
					onEvent: (event) => {
						if (conversationId() !== id || current.signal.aborted) return;
						if (
							options.interactionId &&
							settlesInteraction(event, options.interactionId)
						) {
							accepted.resolve(true);
						}

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
								//* the first message names the chat and delivers its references
								void refreshConversation(id);
								void refreshReferences(id);
								break;
						}

						if (
							event.type === "message" &&
							event.message.parts.some((part) => part.type === "reference") &&
							!referencedMessages.has(event.message.id)
						) {
							referencedMessages.add(event.message.id);
							void refreshReferences(id);
						}
						//* watch snapshots repeat completed calls, so each one refreshes once
						for (const tool of completedTools(event)) {
							if (refreshedTools.has(tool.key)) continue;
							refreshedTools.add(tool.key);
							refreshAfterTool(id, tool.name);
						}

						transcript.apply(event, id);
					},
				});
			} catch (cause) {
				if (!current.signal.aborted) failed(cause);
			} finally {
				await Promise.allSettled([
					conversationId() === id
						? messageHistory.refreshLatest(
								connected ? structuredClone(unwrap(messages)) : undefined,
							)
						: Promise.resolve(),
					refreshConversation(id),
					refreshReferences(id),
					refreshDetails(id),
					queryClient.invalidateQueries({
						queryKey: queryKeys.agent.conversationLists(),
					}),
				]);

				if (controller === current) {
					controller = undefined;
					setStreaming(false);
					transcript.replace(saved());
					setLiveRunId(undefined);
					setLiveContext(undefined);
				}
				accepted.resolve(false);
			}
		})();

		return accepted.promise;
	};

	/** Queues input on the server. The row appears straight away and is removed if the server refuses it. */
	const submit = async (id: string, pending: PendingSubmission) => {
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
					references: pending.references,
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
	createEffect(() => setInputs(reconcile(data()?.inputs ?? [], { key: "id" })));
	//* History changes are infrequent; text deltas patch the store directly.
	createEffect(
		on(saved, (rows) => {
			if (!untrack(streaming)) transcript.replace(rows);
			else {
				const current = untrack(() => [...messages]);
				const first = current[0]?.position;
				transcript.replace([
					...rows.filter((row) => first === undefined || row.position < first),
					...current,
				]);
			}
		}),
	);
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
				void stream(() => api.agent.runStreamUrls.watch(run.id));
			},
		),
	);
	//* a background run can finish between fetches, before a watch stream opens
	createEffect(
		on(
			[() => latestRun()?.id, () => latestRun()?.status],
			() => {
				if (!untrack(streaming)) {
					void messageHistory.refreshLatest().catch(failed);
				}
			},
			{ defer: true },
		),
	);
	onCleanup(() => controller?.abort());

	// ----------------------------------------
	// Return
	return {
		conversation,
		data,
		context: createMemo(() => liveContext() ?? data()?.context),
		compactions: createMemo(() => data()?.compactions ?? []),
		compact: () =>
			stream(api.agent.runStreamUrls.compact, {
				body: { requestId: crypto.randomUUID() },
			}),
		/** Answers again after the latest run failed, without sending a new message. */
		retry: () =>
			stream(api.agent.runStreamUrls.retry, {
				body: { requestId: crypto.randomUUID() },
			}),
		history,
		messages,
		pendingInteraction,
		activeRunId,
		error,
		streaming,
		working: createMemo(() => streaming() || background()),
		waiting: createMemo(() => latestRun()?.status === "waiting"),
		inputs,
		queuePaused: createMemo(() => data()?.queuePaused ?? false),
		/** Sends a message. While the agent is busy it queues, or steers the current run. */
		send: async (
			text: string,
			mode: "send" | "steer" = "send",
			attachments: AgentReferenceItem[] = [],
		) => {
			const references = attachments.map(agentReferenceInput);
			const id = conversationId();
			if (!id) return false;
			const targetRunId = activeRunId();
			const delivery: AgentDelivery =
				mode === "steer" && targetRunId
					? { kind: "steer", targetRunId }
					: { kind: "queue" };
			const pending =
				retrySubmission?.text === text &&
				JSON.stringify(retrySubmission.references) ===
					JSON.stringify(references) &&
				JSON.stringify(retrySubmission.delivery) === JSON.stringify(delivery)
					? retrySubmission
					: { text, references, delivery, requestId: crypto.randomUUID() };
			retrySubmission = pending;

			//* anything the server may still be delivering goes through the queue, to keep order
			const queued =
				streaming() ||
				background() ||
				pendingInteraction() !== undefined ||
				data()?.queuePaused ||
				(data()?.inputs?.length ?? 0) > 0;
			const accepted = queued
				? await submit(id, pending)
				: await stream(api.agent.runStreamUrls.send, {
						body: pending,
						prepare: (messages) => [
							...messages,
							{
								id: pending.requestId,
								conversationId: id,
								runId: pending.requestId,
								role: "user",
								position: (messages.at(-1)?.position ?? 0) + 1,
								parts: [
									...(text ? [{ type: "text" as const, text }] : []),
									...attachments.map((reference) => ({
										type: "reference" as const,
										reference,
									})),
								],
								createdAt: new Date().toISOString(),
							},
						],
					});
			if (accepted && retrySubmission === pending) retrySubmission = undefined;
			return accepted;
		},
		respond: async (
			interaction: { runId: string; id: string },
			response: Record<string, unknown>,
			action: AgentInteractionAction = "submit",
		) => {
			if (streaming()) return { error: T()("agent.interaction.submitting") };
			setResponding(true);
			try {
				const accepted = await stream(
					() => api.agent.runStreamUrls.respond(interaction.runId),
					{
						body: { interactionId: interaction.id, response, action },
						interactionId: interaction.id,
					},
				);
				return accepted
					? { error: undefined }
					: { error: error() ?? T()("agent.errors.stream") };
			} finally {
				setResponding(false);
			}
		},
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

export type AgentChat = ReturnType<typeof useAgentChat>;

export default useAgentChat;

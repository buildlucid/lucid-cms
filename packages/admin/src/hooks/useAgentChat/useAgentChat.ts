import { useQueryClient } from "@tanstack/solid-query";
import type { AgentMessage } from "@types";
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
	findPendingQuestion,
	isRunWorking,
} from "@/utils/agent-chat";

/**
 * Loads a conversation and streams the agent's replies over its saved history.
 * Leaving mid-reply lets the run finish in the background; while it does, the
 * chat watches the run's saved replies until it stops.
 */
export const useAgentChat = (conversationId: Accessor<string | undefined>) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [live, setLive] = createSignal<AgentMessage[]>();
	const [liveRunId, setLiveRunId] = createSignal<string>();
	const [error, setError] = createSignal<string>();
	//* reconciled so streamed updates patch rendered messages instead of remounting them
	const [messages, setMessages] = createStore<AgentMessage[]>([]);
	let controller: AbortController | undefined;
	const streaming = createMemo(() => live() !== undefined);

	// ----------------------------------------
	// Queries & Mutations
	const conversation = api.agent.useGetConversation({ id: conversationId });
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

	// ----------------------------------------
	// Functions
	//* the list key prefixes the conversation and message keys, so this refreshes all three
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: queryKeys.agent.conversations(),
		});

	const stream = async (
		url: string,
		options: {
			body?: Record<string, unknown>;
			prepare?: (messages: AgentMessage[]) => AgentMessage[];
		} = {},
	) => {
		const id = conversationId();
		if (!id || streaming()) return;
		const current = new AbortController();
		controller = current;
		setError(undefined);
		setLive(options.prepare?.(saved()) ?? saved());

		try {
			await api.agent.streamRun({
				url,
				body: options.body,
				signal: current.signal,
				onEvent: (event) => {
					if (event.type === "error") return setError(event.message);
					if (event.type === "start" && !liveRunId()) {
						setLiveRunId(event.runId);
						//* the first message names the chat
						void queryClient.invalidateQueries({
							queryKey: queryKeys.agent.conversation(id),
						});
					}
					setLive((messages) => applyStreamEvent(messages ?? [], event, id));
				},
			});
		} catch (cause) {
			if (!current.signal.aborted) {
				setError(
					cause instanceof Error ? cause.message : T()("agent.errors.stream"),
				);
			}
		} finally {
			await refresh();
			if (controller === current) {
				controller = undefined;
				setLive(undefined);
				setLiveRunId(undefined);
			}
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() => setMessages(reconcile(live() ?? saved(), { key: "id" })));
	createEffect(
		on(
			conversationId,
			() => {
				controller?.abort();
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
	onCleanup(() => controller?.abort());

	// ----------------------------------------
	// Return
	return {
		conversation,
		history,
		messages,
		pendingQuestion,
		error,
		streaming,
		/** True while the agent is replying here or in the background. */
		working: createMemo(() => streaming() || background()),
		send: (text: string) => {
			const id = conversationId();
			const requestId = crypto.randomUUID();
			return stream(`/lucid/api/v1/agent/conversations/${id}/messages`, {
				body: { text, requestId },
				prepare: (messages) => [
					...messages,
					{
						id: requestId,
						conversationId: id ?? "",
						runId: requestId,
						position: (messages.at(-1)?.position ?? 0) + 1,
						role: "user",
						parts: [{ type: "text", text }],
						createdAt: new Date().toISOString(),
					},
				],
			});
		},
		respond: (question: { runId: string; id: string }, answer: string) =>
			stream(`/lucid/api/v1/agent/runs/${question.runId}/respond`, {
				body: { questionId: question.id, answer },
				prepare: (messages) => answerQuestion(messages, question.id, answer),
			}),
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

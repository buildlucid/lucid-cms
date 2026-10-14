import type {
	AgentDelivery,
	AgentInput,
	AgentInputAction,
} from "@lucidcms/types";
import { useQueryClient } from "@tanstack/solid-query";
import type {
	AgentContextUsage,
	AgentConversation,
	AgentInteractionAction,
	AgentMessage,
	AgentReferenceInput,
	AgentResource,
	AgentScreen,
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
import { refreshAgentChanges } from "@/utils/agent-changes";
import {
	awaitsDelivery,
	completedTools,
	createAgentMessages,
	findPendingInteraction,
	isRunWorking,
	settlesInteraction,
} from "@/utils/agent-chat";
import {
	type AgentReferenceItem,
	agentReferenceInput,
} from "@/utils/agent-references";
import {
	isScreenCallData,
	referencesWidget,
	referenceTools,
	screenWidget,
	webReadTool,
	webSearchTool,
} from "@/utils/agent-tools";
import { getDefaultTimezone } from "@/utils/request-schedule";

/** Input the server has not yet accepted, kept so a retry reuses its input ID. */
type PendingSubmission = {
	text: string;
	references: AgentReferenceInput[];
	screen?: AgentScreen;
	/** Browser timezone used for local message timestamps. */
	timezone: string;
	delivery: AgentDelivery;
	inputId: string;
};

/**
 * Loads a conversation and streams the agent's replies over its saved history.
 * Leaving mid-reply lets the run finish in the background; while it does, the
 * chat watches the run's saved replies until it stops. Messages sent while the
 * agent is busy queue on the server, so they are delivered even if the chat is
 * closed.
 */
export const useAgentChat = (
	conversationId: Accessor<string | undefined>,
	options: {
		/** Called with what each completed tool call changed, after its views refresh. */
		onChanges?: (changes: AgentResource[]) => void;
		/** The admin screen messages are sent from, which answers the agent's builder tools. */
		screen?: Accessor<AgentScreen | undefined>;
	} = {},
) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [streaming, setStreaming] = createSignal(false);
	const [responding, setResponding] = createSignal(false);
	const [liveRunId, setLiveRunId] = createSignal<string>();
	const [error, setError] = createSignal<string>();
	const [liveContext, setLiveContext] = createSignal<AgentContextUsage>();
	//* reconciled so streamed updates patch rendered rows instead of remounting them
	const [inputs, setInputs] = createStore<AgentInput[]>([]);
	const transcript = createAgentMessages();
	const messages = transcript.messages;
	//* a failed submission keeps its request id, so resending it cannot create a duplicate
	let retrySubmission: PendingSubmission | undefined;
	let controller: AbortController | undefined;
	/** Identifies the chat that owns the active stream. */
	let streamingConversationId: string | undefined;

	// ----------------------------------------
	// Queries & Mutations
	const conversation = api.agent.useGetConversation({
		id: conversationId,
		poll: (data) => {
			if (!untrack(streaming) && awaitsDelivery(data)) return 1_000;
			return data.titleStatus === "generating" ? 4_000 : false;
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
	const waitingOn = createMemo(() =>
		latestRun()?.status === "waiting" && (!streaming() || responding())
			? findPendingInteraction(messages, latestRun()?.id)
			: undefined,
	);
	//* a screen call is answered by the screen, not the person, so the chat stays working while it waits
	const screenCall = createMemo(() => {
		const pending = waitingOn();
		return pending?.widget.key === screenWidget &&
			isScreenCallData(pending.widget.data)
			? { ...pending, call: pending.widget.data }
			: undefined;
	});
	const pendingInteraction = createMemo(() =>
		screenCall() ? undefined : waitingOn(),
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
	/** Refreshes what a completed call changed during the run: the chat's references and web sources, and open views of the resources it reports. */
	const refreshAfterTool = (
		id: string,
		tool: ReturnType<typeof completedTools>[number],
	) => {
		if (tool.changes.length > 0 || referenceTools.has(tool.name)) {
			void refreshReferences(id);
		}
		if (tool.name === webSearchTool || tool.name === webReadTool) {
			void refreshDetails(id);
		}
		refreshAgentChanges(queryClient, tool.changes);
		if (tool.changes.length > 0) options.onChanges?.(tool.changes);
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
		streamingConversationId = id;
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

						//* attachments and references widgets mean new links; snapshots repeat them, so each count refreshes once
						if (event.type === "widget" && event.key === referencesWidget) {
							void refreshReferences(id);
						}
						if (event.type === "message") {
							const linked = event.message.parts.filter(
								(part) =>
									part.type === "reference" ||
									(part.type === "widget" && part.key === referencesWidget),
							).length;
							const key = `${event.message.id}:${linked}`;
							if (linked > 0 && !referencedMessages.has(key)) {
								referencedMessages.add(key);
								void refreshReferences(id);
							}
						}
						//* watch snapshots repeat completed calls, so each one refreshes once
						for (const tool of completedTools(event)) {
							if (refreshedTools.has(tool.key)) continue;
							refreshedTools.add(tool.key);
							refreshAfterTool(id, tool);
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
				...(data.inputs ?? []).filter((input) => input.id !== pending.inputId),
				{
					id: pending.inputId,
					text: pending.text,
					references: pending.references,
					screen: pending.screen ?? null,
					status: "pending",
					delivery: pending.delivery,
				},
			],
		}));
		try {
			await api.agent.submitInput({ conversationId: id, ...pending });
			//* sending counts as reviewing a routine run, which resolves its notification
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.summary(),
			});
			await refreshConversation(id);
			return true;
		} catch (cause) {
			patchConversation(id, (data) => ({
				...data,
				inputs: data.inputs?.filter((input) => input.id !== pending.inputId),
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
			if (
				!untrack(streaming) ||
				streamingConversationId !== untrack(conversationId)
			) {
				transcript.replace(rows);
			} else {
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
				controller = undefined;
				streamingConversationId = undefined;
				setStreaming(false);
				setLiveRunId(undefined);
				setLiveContext(undefined);
				transcript.replace(untrack(saved));
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
				body: { runId: crypto.randomUUID() },
			}),
		/** Answers again after the latest run failed, without sending a new message. */
		retry: () =>
			stream(api.agent.runStreamUrls.retry, {
				body: { runId: crypto.randomUUID() },
			}),
		history,
		messages,
		pendingInteraction,
		activeRunId,
		error,
		streaming,
		/** The screen call the run waits on, for this tab's screen to answer. */
		screenCall,
		working: createMemo(
			() => streaming() || background() || screenCall() !== undefined,
		),
		waiting: createMemo(
			() => latestRun()?.status === "waiting" && screenCall() === undefined,
		),
		inputs,
		queuePaused: createMemo(() => data()?.queuePaused ?? false),
		/** Sends a message. While the agent is busy it queues, or steers the current run. */
		send: async (
			text: string,
			mode: "send" | "steer" = "send",
			attachments: AgentReferenceItem[] = [],
		) => {
			const references = attachments.map(agentReferenceInput);
			const screen = options.screen?.();
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
				JSON.stringify(retrySubmission.screen) === JSON.stringify(screen) &&
				JSON.stringify(retrySubmission.delivery) === JSON.stringify(delivery)
					? retrySubmission
					: {
							text,
							references,
							screen,
							timezone: getDefaultTimezone(),
							delivery,
							inputId: crypto.randomUUID(),
						};
			retrySubmission = pending;

			//* anything the server may still be delivering goes through the queue, to keep order
			const queued =
				streaming() ||
				background() ||
				waitingOn() !== undefined ||
				data()?.queuePaused ||
				(data()?.inputs?.length ?? 0) > 0;
			const accepted = queued
				? await submit(id, pending)
				: await stream(api.agent.runStreamUrls.send, {
						body: pending,
						prepare: (messages) => [
							...messages,
							{
								id: pending.inputId,
								conversationId: id,
								runId: pending.inputId,
								role: "user",
								position: (messages.at(-1)?.position ?? 0) + 1,
								parts: [
									...(text ? [{ type: "text" as const, text }] : []),
									...attachments.map((reference) => ({
										type: "reference" as const,
										reference,
									})),
									...(screen ? [{ type: "screen" as const, screen }] : []),
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
				//* answering resolves the run's "input needed" notification
				if (accepted) {
					void queryClient.invalidateQueries({
						queryKey: queryKeys.notifications.summary(),
					});
				}
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
			const chatId = conversationId();
			//* a failed cancel shows its own error toast, and the stream still stops
			if (id && chatId) {
				await cancelRun.action
					.mutateAsync({ id, conversationId: chatId })
					.catch(() => undefined);
			}
			controller?.abort();
		},
	};
};

export type AgentChat = ReturnType<typeof useAgentChat>;

export default useAgentChat;

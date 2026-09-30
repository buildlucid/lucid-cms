import type {
	AgentCompaction,
	AgentConversation,
	AgentMessage,
	AgentMessagePart,
	AgentRunStatus,
	AgentStreamEvent,
	AgentToolSummary,
	AgentWidgetPart,
} from "@types";
import { batch } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { askTool, finishTool, progressTool } from "@/utils/agent-tools";

export const shouldPollTitle = (
	conversation: Pick<
		AgentConversation,
		"titleStatus" | "titleGenerationRequestedAt"
	>,
) => {
	const requestedAt = conversation.titleGenerationRequestedAt;
	if (conversation.titleStatus !== "provisional" || !requestedAt) return false;
	const age = Date.now() - new Date(requestedAt).getTime();
	return age >= 0 && age < 60_000;
};

/**
 * How a part shows in the transcript. Runs of rows sit close together, even
 * across messages, so they read as one block. A pending inline interaction is a
 * form; once answered it becomes a row, like one shown in the chat box.
 */
export const partLayout = (
	part: AgentMessagePart,
	hasRow: (widget: AgentWidgetPart) => boolean,
): "row" | "block" | "hidden" => {
	switch (part.type) {
		case "reference":
		case "text": {
			return "block";
		}
		case "tool": {
			if (part.name === askTool) return "hidden";
			if (part.name === progressTool) {
				return part.status === "complete" ? "block" : "hidden";
			}

			return part.name === finishTool ? "block" : "row";
		}
		case "widget": {
			if (!part.interaction) return hasRow(part) ? "row" : "block";

			return part.interaction.placement === "inline" &&
				part.interaction.status === "pending"
				? "block"
				: "row";
		}
	}
};

export const messageText = (message: Pick<AgentMessage, "parts">) =>
	message.parts
		.flatMap((part) => {
			if (part.type === "text") return [part.text];
			if (
				part.type === "tool" &&
				part.name === progressTool &&
				part.status === "complete" &&
				part.display?.kind === "progress"
			) {
				return [part.display.message];
			}

			return [];
		})
		.join("\n\n")
		.trim();

/** Keeps row identities stable and applies stream deltas only to their message and part. */
export const createAgentMessages = () => {
	const [messages, setMessages] = createStore<AgentMessage[]>([]);
	const messageIndices = new Map<string, number>();

	const replace = (rows: AgentMessage[]) => {
		setMessages(reconcile(structuredClone(unwrap(rows)), { key: "id" }));

		messageIndices.clear();
		messages.forEach((message, index) => {
			messageIndices.set(message.id, index);
		});
	};

	const startMessage = (
		event: Extract<AgentStreamEvent, { type: "start" }>,
		conversationId: string,
	) => {
		const index = messageIndices.get(event.messageId);

		//* a restarted turn replaces what the previous attempt streamed
		if (index !== undefined) {
			setMessages(index, "parts", []);
			return;
		}

		messageIndices.set(event.messageId, messages.length);
		setMessages(messages.length, {
			id: event.messageId,
			conversationId,
			runId: event.runId,
			position: (messages.at(-1)?.position ?? 0) + 1,
			role: "assistant",
			parts: [],
			createdAt: new Date().toISOString(),
		});
	};

	const appendText = (index: number, text: string) => {
		const parts = messages[index].parts;
		const last = parts.at(-1);

		if (last?.type === "text") {
			setMessages(index, "parts", parts.length - 1, {
				type: "text",
				text: last.text + text,
			});
			return;
		}

		setMessages(index, "parts", parts.length, { type: "text", text });
	};

	/** Later tool events can leave out fields set when the call started, so tool parts merge. */
	const upsertPart = (
		index: number,
		part: AgentToolSummary | AgentWidgetPart,
	) => {
		const parts = messages[index].parts;
		const partIndex = parts.findIndex((existing) =>
			part.type === "tool"
				? existing.type === "tool" && existing.id === part.id
				: existing.type === "widget" &&
					!!part.interaction?.id &&
					existing.interaction?.id === part.interaction.id,
		);

		batch(() => {
			if (partIndex < 0) {
				setMessages(index, "parts", parts.length, part);
			} else if (part.type === "tool") {
				setMessages(index, "parts", partIndex, part);
			} else {
				setMessages(index, "parts", partIndex, reconcile(part));
			}

			if (part.type !== "tool" || part.status !== "skipped") return;

			parts.forEach((existing, widgetIndex) => {
				if (
					existing.type === "widget" &&
					existing.interaction?.toolCallId === part.id &&
					existing.interaction.status === "pending"
				) {
					setMessages(index, "parts", widgetIndex, {
						type: "widget",
						interaction: { ...existing.interaction, status: "dismissed" },
					});
				}
			});
		});
	};

	const apply = (event: AgentStreamEvent, conversationId: string) => {
		if (event.type === "message") {
			const index = messageIndices.get(event.message.id);
			if (index !== undefined) {
				setMessages(index, reconcile(event.message));
				return;
			}

			replace(
				[...messages, event.message].sort((a, b) => a.position - b.position),
			);
			return;
		}

		if (!("messageId" in event)) return;
		if (event.type === "start") return startMessage(event, conversationId);

		const index = messageIndices.get(event.messageId);
		if (index === undefined) return;

		if (event.type === "text-delta") return appendText(index, event.text);

		const { messageId: _, ...part } = event;
		upsertPart(index, part);
	};

	return { messages, replace, apply };
};

/** The active interaction is recovered from saved messages after a reload. */
export const findPendingInteraction = (
	messages: AgentMessage[],
	runId: string | undefined,
) => {
	if (!runId) return undefined;

	for (const message of messages.toReversed()) {
		if (message.runId !== runId) continue;

		for (const part of message.parts.toReversed()) {
			if (part.type === "widget" && part.interaction?.status === "pending") {
				return { runId, widget: part, id: part.interaction.id };
			}
		}
	}

	return undefined;
};

/** Run statuses to filter by, grouped as the status pills show them. Values are comma separated where a pill covers more than one. */
export const runStatusFilters = [
	{ value: "waiting", label: "agent.status.waiting" },
	{ value: "queued,running", label: "agent.status.working" },
	{ value: "interrupted", label: "agent.status.retrying" },
	{ value: "completed", label: "agent.status.done" },
	{ value: "failed", label: "agent.status.failed" },
	{ value: "cancelled", label: "agent.status.stopped" },
] as const;

/** Whether a run is still being worked on by the agent, in this tab or in the background. */
export const isRunWorking = (status: AgentRunStatus | undefined) =>
	status === "queued" || status === "running" || status === "interrupted";

/**
 * Where to mark compactions: before the first message created after each one.
 * `trailing` marks a compaction newer than every message, such as one just run.
 */
export const placeCompactions = (
	messages: AgentMessage[],
	compactions: AgentCompaction[],
) => {
	const before = new Set<string>();
	let trailing = false;

	for (const compaction of compactions) {
		const next = messages.find(
			(message) => (message.createdAt ?? "") > (compaction.createdAt ?? ""),
		);
		if (next) before.add(next.id);
		else {
			trailing = true;
		}
	}

	return { before, trailing };
};

/**
 * Queued input is waiting on the server to start its run: nothing is streaming
 * it, and no person needs to act first. The chat checks back until it starts.
 */
export const awaitsDelivery = (
	conversation: Pick<AgentConversation, "inputs" | "queuePaused" | "latestRun">,
) => {
	if (!conversation.inputs?.length || conversation.queuePaused) return false;
	const status = conversation.latestRun?.status;
	if (isRunWorking(status)) return false;

	//* a waiting run only continues for a steer; a plain follow-up waits for the answer
	return (
		status !== "waiting" ||
		conversation.inputs.some((input) => input.delivery.kind === "steer")
	);
};

/** Whether an event confirms that an interaction was answered or cancelled. */
export const settlesInteraction = (
	event: AgentStreamEvent,
	interactionId: string,
) => {
	const parts =
		event.type === "message"
			? event.message.parts
			: event.type === "widget"
				? [event]
				: [];

	return parts.some(
		(part) =>
			part.type === "widget" &&
			part.interaction?.id === interactionId &&
			(part.interaction.status === "answered" ||
				part.interaction.status === "cancelled"),
	);
};

/** The completed tool calls an event reports, keyed by message and call. */
export const completedTools = (event: AgentStreamEvent) => {
	if (event.type === "tool") {
		return event.status === "complete"
			? [{ key: `${event.messageId}:${event.id}`, name: event.name }]
			: [];
	}
	if (event.type !== "message") return [];

	return event.message.parts.flatMap((part) =>
		part.type === "tool" && part.status === "complete"
			? [{ key: `${event.message.id}:${part.id}`, name: part.name }]
			: [],
	);
};

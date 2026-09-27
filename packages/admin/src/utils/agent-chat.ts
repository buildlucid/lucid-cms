import type {
	AgentCompaction,
	AgentConversation,
	AgentMessage,
	AgentMessagePart,
	AgentRunStatus,
	AgentStreamEvent,
	AgentWidgetPart,
} from "@types";
import helpers from "@/utils/helpers";

export type AgentToolPart = Extract<AgentMessagePart, { type: "tool" }>;

export const askTool = "lucid_ask_user";
export const finishTool = "lucid_finish_run";
export const questionWidget = "lucid-question";
export const approvalWidget = "lucid-tool-approval";

/** Tool calls shown as rows in the chat and listed in its sidebar. */
export const isToolRow = (part: AgentMessagePart): part is AgentToolPart =>
	part.type === "tool" && part.name !== askTool && part.name !== finishTool;

export const toolTitle = (part: Pick<AgentToolPart, "name" | "title">) =>
	helpers.getLocaleValue({
		value: part.title,
		fallback: part.name.replaceAll("_", " "),
	});

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
		case "text":
			return "block";
		case "tool":
			if (part.name === askTool) return "hidden";
			return part.name === finishTool ? "block" : "row";
		case "widget":
			if (!part.interaction) return hasRow(part) ? "row" : "block";
			return part.interaction.placement === "inline" &&
				part.interaction.status === "pending"
				? "block"
				: "row";
	}
};

export const messageText = (message: Pick<AgentMessage, "parts">) =>
	message.parts
		.flatMap((part) => (part.type === "text" ? [part.text] : []))
		.join("\n\n")
		.trim();

/** Updates a tool part with the same id, or appends it. Later events can leave out fields set when the call started, such as its title. */
const upsertPart = (
	parts: AgentMessagePart[],
	part: AgentToolPart,
): AgentMessagePart[] => {
	const index = parts.findIndex(
		(existing) => existing.type === part.type && existing.id === part.id,
	);
	return index < 0
		? [...parts, part]
		: parts.map((existing, position) =>
				position === index ? { ...existing, ...part } : existing,
			);
};

const appendText = (
	parts: AgentMessagePart[],
	text: string,
): AgentMessagePart[] => {
	const last = parts.at(-1);
	return last?.type === "text"
		? [...parts.slice(0, -1), { type: "text", text: last.text + text }]
		: [...parts, { type: "text", text }];
};

/** Applies one streamed run event to the messages shown in a conversation. */
export const applyStreamEvent = (
	messages: AgentMessage[],
	event: AgentStreamEvent,
	conversationId: string,
): AgentMessage[] => {
	if (
		event.type === "finish" ||
		event.type === "error" ||
		event.type === "context" ||
		event.type === "inputs" ||
		event.type === "next"
	) {
		return messages;
	}

	if (event.type === "message") {
		const exists = messages.some(({ id }) => id === event.message.id);
		return exists
			? messages.map((message) =>
					message.id === event.message.id ? event.message : message,
				)
			: [...messages, event.message].sort((a, b) => a.position - b.position);
	}

	if (event.type === "start") {
		const exists = messages.some((message) => message.id === event.messageId);
		//* a restarted turn replaces what the previous attempt streamed
		if (exists) {
			return messages.map((message) =>
				message.id === event.messageId ? { ...message, parts: [] } : message,
			);
		}
		return [
			...messages,
			{
				id: event.messageId,
				conversationId,
				runId: event.runId,
				position: (messages.at(-1)?.position ?? 0) + 1,
				role: "assistant",
				parts: [],
				createdAt: new Date().toISOString(),
			},
		];
	}

	return messages.map((message) => {
		if (message.id !== event.messageId) return message;
		if (event.type === "text-delta") {
			return { ...message, parts: appendText(message.parts, event.text) };
		}
		const { messageId: _, ...part } = event;
		if (part.type === "widget") {
			const id = part.interaction?.id;
			const exists =
				id &&
				message.parts.some(
					(existing) =>
						existing.type === "widget" && existing.interaction?.id === id,
				);
			return {
				...message,
				parts: exists
					? message.parts.map((existing) =>
							existing.type === "widget" && existing.interaction?.id === id
								? part
								: existing,
						)
					: [...message.parts, part],
			};
		}

		return {
			...message,
			parts: upsertPart(message.parts, part).map((existing) =>
				part.status === "skipped" &&
				existing.type === "widget" &&
				existing.interaction?.toolCallId === part.id &&
				existing.interaction.status === "pending"
					? {
							...existing,
							interaction: { ...existing.interaction, status: "dismissed" },
						}
					: existing,
			),
		};
	});
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
		else trailing = true;
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

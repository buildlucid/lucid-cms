import type {
	AgentCompaction,
	AgentMessage,
	AgentMessagePart,
	AgentRunStatus,
	AgentStreamEvent,
} from "@types";

/** Replaces a tool or question part with the same id, or appends it. */
const upsertPart = (
	parts: AgentMessagePart[],
	part: Extract<AgentMessagePart, { type: "tool" | "question" }>,
): AgentMessagePart[] => {
	const index = parts.findIndex(
		(existing) => existing.type === part.type && existing.id === part.id,
	);
	return index < 0
		? [...parts, part]
		: parts.map((existing, position) => (position === index ? part : existing));
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
		event.type === "context"
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
			return { ...message, parts: [...message.parts, part] };
		}
		if (part.type === "question") {
			const { runId: __, ...question } = part;
			return { ...message, parts: upsertPart(message.parts, question) };
		}
		return { ...message, parts: upsertPart(message.parts, part) };
	});
};

/** Records an answer against its question so the card updates before the run continues. */
export const answerQuestion = (
	messages: AgentMessage[],
	questionId: string,
	answer: string,
): AgentMessage[] =>
	messages.map((message) => ({
		...message,
		parts: message.parts.map((part) =>
			part.type === "question" && part.id === questionId
				? { ...part, answer }
				: part,
		),
	}));

/** The unanswered question a waiting run is paused on, if any. */
export const findPendingQuestion = (
	messages: AgentMessage[],
	runId: string | undefined,
) => {
	if (!runId) return undefined;
	for (const message of messages.toReversed()) {
		if (message.runId !== runId) continue;
		const question = message.parts.findLast(
			(part) => part.type === "question" && part.answer === undefined,
		);
		if (question?.type === "question") return { runId, ...question };
	}
	return undefined;
};

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

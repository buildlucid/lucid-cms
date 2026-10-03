import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { copy } from "../i18n/index.js";
import {
	compactionCut,
	contextTokens,
	estimateTokens,
	historyMessage,
	modelMessages,
	settleToolCall,
	summaryMessage,
} from "./context.js";
import type { Checkpoint } from "./types.js";

const unlimited = { retain: 0, max: Number.POSITIVE_INFINITY };

test("orders completed calls within their turn without moving earlier tool history", () => {
	const messageId = randomUUID();
	const earlier = historyMessage({
		id: randomUUID(),
		position: 1,
		role: "assistant",
		parts: [
			{
				type: "tool",
				id: "second",
				name: "read",
				input: {},
				status: "complete",
				summary: copy.literal("Read the earlier source."),
				output: "earlier result",
			},
		],
	}).messages;
	const first = { id: "first", name: "read", input: {} };
	const second = { id: "second", name: "read", input: {} };
	const checkpoint: Checkpoint = {
		version: 1,
		approvalMode: "confirm-all",
		nudges: 0,
		requestId: randomUUID(),
		messageId,
		messages: [
			...earlier,
			{ role: "assistant", sourceId: messageId, toolCalls: [first, second] },
		],
		parts: [
			{
				type: "tool",
				...first,
				status: "running",
				summary: copy.literal("Reading the first source."),
			},
			{
				type: "tool",
				...second,
				status: "running",
				summary: copy.literal("Reading the second source."),
			},
		],
		calls: [first, second],
		cursor: 0,
		phase: "tools",
	};

	settleToolCall(checkpoint, second, {
		status: "complete",
		output: 2,
		summary: copy.literal("Read the second source."),
	});
	settleToolCall(checkpoint, first, {
		status: "complete",
		output: 1,
		summary: copy.literal("Read the first source."),
	});

	expect(checkpoint.messages.slice(0, earlier.length)).toEqual(earlier);
	expect(checkpoint.messages.slice(earlier.length + 1)).toMatchObject([
		{ role: "tool", sourceId: messageId, toolCallId: "first", output: 1 },
		{ role: "tool", sourceId: messageId, toolCallId: "second", output: 2 },
	]);
	expect(checkpoint.parts).toMatchObject([
		{
			id: "first",
			status: "complete",
			summary: copy.literal("Read the first source."),
		},
		{
			id: "second",
			status: "complete",
			summary: copy.literal("Read the second source."),
		},
	]);
	expect(
		modelMessages(checkpoint.messages)
			.filter((message) => message.role === "tool")
			.slice(-2),
	).toEqual([
		{ role: "tool", toolCallId: "first", name: "read", output: 1 },
		{ role: "tool", toolCallId: "second", name: "read", output: 2 },
	]);
});

test("a call settled without a summary keeps the one it had while running", () => {
	const messageId = randomUUID();
	const call = { id: "write", name: "write", input: {} };
	const checkpoint: Checkpoint = {
		version: 1,
		approvalMode: "confirm-all",
		nudges: 0,
		requestId: randomUUID(),
		messageId,
		messages: [{ role: "assistant", sourceId: messageId, toolCalls: [call] }],
		parts: [
			{
				type: "tool",
				...call,
				status: "running",
				summary: copy.literal("Update the home page"),
			},
		],
		calls: [call],
		cursor: 0,
		phase: "tools",
	};

	expect(
		settleToolCall(checkpoint, call, {
			status: "failed",
			output: { error: "The user denied this action." },
		}),
	).toMatchObject({
		status: "failed",
		summary: copy.literal("Update the home page"),
	});
});

test("retains complete tool exchanges when selecting a compaction boundary", () => {
	const first = randomUUID();
	const tool = randomUUID();
	const messages: Checkpoint["messages"] = [
		{
			role: "user",
			sourceId: first,
			content: "Never publish without approval.",
		},
		{
			role: "assistant",
			sourceId: tool,
			toolCalls: [{ id: "call", name: "read", input: {} }],
		},
		{
			role: "tool",
			sourceId: tool,
			toolCallId: "call",
			name: "read",
			output: "x".repeat(15_000),
		},
		{ role: "user", sourceId: randomUUID(), content: "Continue" },
	];
	expect(compactionCut(messages, { retain: 100, max: 10_000 })).toBe(3);
	//* a call without its result is never summarised
	expect(compactionCut(messages.slice(0, 2), unlimited)).toBe(1);
	expect(compactionCut(messages.slice(1, 2), unlimited)).toBe(0);
	//* the summarised prefix must fit in one request
	expect(compactionCut(messages, { retain: 0, max: 100 })).toBe(1);
});

test("carries the earlier summary into the next compaction without sending source IDs", () => {
	const sourceId = randomUUID();
	const messages: Checkpoint["messages"] = [
		summaryMessage("Keep drafts unpublished."),
		{ role: "user", sourceId, content: "Use fr-FR." },
		{ role: "assistant", sourceId: randomUUID(), content: "Draft saved." },
	];
	expect(compactionCut(messages, unlimited)).toBe(3);
	expect(modelMessages(messages)[1]).toEqual({
		role: "user",
		content: "Use fr-FR.",
	});
});

test("counts the last measured request plus messages added since", () => {
	const reply = { role: "assistant" as const, content: "x".repeat(400) };
	const checkpoint = {
		messages: [{ role: "user" as const, content: "Hello" }, reply],
		measured: { tokens: 5_000, messages: 1 },
	} as Checkpoint;
	const setup = { instructions: "y".repeat(40_000), definitions: [] };

	expect(contextTokens(checkpoint, setup)).toBe(
		5_000 + estimateTokens([reply]),
	);
	//* without a measurement, instructions and tools are estimated too
	expect(
		contextTokens({ ...checkpoint, measured: undefined }, setup),
	).toBeGreaterThan(10_000);
});

test("replays saved tool calls as calls and results, never as text the assistant wrote", () => {
	const { messages, truncated } = historyMessage({
		id: randomUUID(),
		position: 12,
		role: "assistant",
		parts: [
			{ type: "text", text: "Checking." },
			{
				type: "tool",
				id: "publish",
				name: "publish",
				input: { id: 7 },
				status: "failed",
				summary: copy.literal("The user denied publishing."),
				output: { error: "The user denied this action." },
			},
			{
				type: "tool",
				id: "ask",
				name: "lucid_ask_user",
				input: { question: "Which colour?" },
				status: "complete",
				summary: copy.literal("The user chose {{answer}}.", {
					answer: "Blue",
				}),
				output: { answer: "Blue" },
			},
			{
				type: "widget",
				key: "lucid-question",
				version: 1,
				data: { question: "Which colour?" },
				interaction: {
					id: "question",
					toolCallId: "ask",
					title: "Which colour?",
					placement: "composer",
					status: "answered",
					response: { answer: "Blue" },
				},
			},
		],
	});

	expect(truncated).toBe(false);
	expect(modelMessages(messages)).toEqual([
		{
			role: "assistant",
			content: "Checking.",
			toolCalls: [
				{ id: "publish", name: "publish", input: { id: 7 } },
				{
					id: "ask",
					name: "lucid_ask_user",
					input: { question: "Which colour?" },
				},
			],
		},
		{
			role: "tool",
			toolCallId: "publish",
			name: "publish",
			output: { error: "The user denied this action." },
		},
		{
			role: "tool",
			toolCallId: "ask",
			name: "lucid_ask_user",
			output: { answer: "Blue" },
		},
	]);
	//* the replayed turn stays whole, so compaction never separates a call from its result
	expect(compactionCut(messages.slice(0, 2), unlimited)).toBe(0);
	expect(compactionCut(messages, unlimited)).toBe(3);
});

test("an unfinished call still gets a result, and long values become history previews", () => {
	const id = randomUUID();
	const { messages, truncated } = historyMessage({
		id,
		position: 3,
		role: "assistant",
		parts: [
			{
				type: "tool",
				id: "large",
				name: "read",
				input: { body: "x".repeat(30_000) },
				status: "complete",
				summary: copy.literal("Read the large source."),
				output: { body: "y".repeat(30_000) },
			},
			{
				type: "tool",
				id: "interrupted",
				name: "write",
				input: {},
				status: "running",
				summary: copy.literal("Writing the document."),
			},
		],
	});
	const preview = {
		truncated: true,
		historyMessageId: id,
		toolCallId: "large",
	};

	expect(truncated).toBe(true);
	expect(messages).toMatchObject([
		{ role: "assistant", toolCalls: [{ input: preview }, { input: {} }] },
		{ role: "tool", toolCallId: "large", output: preview },
		{
			role: "tool",
			toolCallId: "interrupted",
			output: { error: "No result was recorded for this call." },
		},
	]);
});

test("replays attachments with their names and types, keeping labels as quoted data", () => {
	const { messages } = historyMessage({
		id: randomUUID(),
		position: 1,
		role: "user",
		parts: [
			{ type: "text", text: "Investigate this" },
			{
				type: "reference",
				reference: {
					type: "media",
					mediaId: 12,
					label: 'Letter "March" <draft>',
					mimeType: "application/pdf",
				},
			},
			{
				type: "reference",
				reference: {
					type: "document",
					collectionKey: "pages",
					documentId: 7,
					versionId: 3,
					label: "About us",
				},
			},
		],
	});
	expect(messages[0]).toMatchObject({ role: "user" });
	expect(messages[0]).toHaveProperty(
		"content",
		[
			"Investigate this",
			"",
			"<attachments>",
			'<attachment type="media" media_id="12" name="Letter &quot;March&quot; &lt;draft>" mime_type="application/pdf" />',
			'<attachment type="document" collection_key="pages" document_id="7" version_id="3" name="About us" />',
			"</attachments>",
		].join("\n"),
	);
});

test("a routine request reads as the routine's standing task, not a request to schedule it", () => {
	const request = (parts: Parameters<typeof historyMessage>[0]["parts"]) =>
		historyMessage({ id: "m1", role: "user", position: 1, parts }).messages[0]
			?.content;
	const routine = {
		type: "routine",
		name: "Fact check",
		instructions: "Every morning, check each blog.",
		trigger: "schedule",
	} as const;

	expect(request([routine, { type: "text", text: routine.instructions }])).toBe(
		'Start a run of the "Fact check" routine. Its standing instructions follow:\n\nEvery morning, check each blog.',
	);
	expect(request([routine])).toBe(
		'Start a run of the "Fact check" routine. Its instructions are unchanged from earlier in this chat.',
	);
});

import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import {
	compactionCut,
	contextTokens,
	estimateTokens,
	historyMessage,
	modelMessages,
	summaryMessage,
} from "./context.js";
import type { Checkpoint } from "./types.js";

const unlimited = { retain: 0, max: Number.POSITIVE_INFINITY };

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
				output: { error: "The user denied this action." },
			},
			{
				type: "tool",
				id: "ask",
				name: "lucid_ask_user",
				input: { question: "Which colour?" },
				status: "complete",
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
				output: { body: "y".repeat(30_000) },
			},
			{
				type: "tool",
				id: "interrupted",
				name: "write",
				input: {},
				status: "running",
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

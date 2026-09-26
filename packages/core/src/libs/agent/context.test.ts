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
	const capabilities = { instructions: "y".repeat(40_000), definitions: [] };

	expect(contextTokens(checkpoint, capabilities)).toBe(
		5_000 + estimateTokens([reply]),
	);
	//* without a measurement, instructions and tools are estimated too
	expect(
		contextTokens({ ...checkpoint, measured: undefined }, capabilities),
	).toBeGreaterThan(10_000);
});

test("historical tool outcomes and answers survive between user turns", () => {
	const { message, truncated } = historyMessage({
		id: randomUUID(),
		position: 12,
		role: "assistant",
		parts: [
			{
				type: "tool",
				id: "large",
				name: "read",
				input: { body: "x".repeat(30_000) },
				status: "failed",
				output: { error: "Permission denied" },
			},
			{
				type: "question",
				kind: "approval",
				id: "call",
				question: "Publish?",
				answer: "deny",
			},
			{
				type: "tool",
				id: "call",
				name: "publish",
				input: { id: 7 },
				status: "failed",
				output: { error: "Denied" },
			},
		],
	});
	expect(truncated).toBe(true);
	expect(message).toMatchObject({
		role: "assistant",
		content: expect.stringContaining('"answer":"deny"'),
	});
	expect(message).toMatchObject({
		content: expect.stringContaining('"status":"failed"'),
	});
	expect(message).toMatchObject({
		content: expect.stringContaining("Permission denied"),
	});
});

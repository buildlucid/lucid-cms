import type { AgentMessage, AgentStreamEvent } from "@types";
import { describe, expect, it } from "vitest";
import { applyStreamEvent, findPendingQuestion } from "./agent-chat";

const conversationId = "conversation";
const apply = (events: AgentStreamEvent[], messages: AgentMessage[] = []) =>
	events.reduce(
		(current, event) => applyStreamEvent(current, event, conversationId),
		messages,
	);

describe("applyStreamEvent", () => {
	it("builds a reply from streamed text, tools and widgets", () => {
		const [message] = apply([
			{ type: "start", runId: "run", messageId: "m1" },
			{ type: "text-delta", messageId: "m1", text: "Hel" },
			{ type: "text-delta", messageId: "m1", text: "lo" },
			{
				type: "tool",
				messageId: "m1",
				id: "t1",
				name: "echo",
				input: {},
				status: "pending",
			},
			{
				type: "tool",
				messageId: "m1",
				id: "t1",
				name: "echo",
				input: {},
				status: "complete",
				output: { ok: true },
			},
			{ type: "widget", messageId: "m1", key: "chart", version: 1, data: {} },
		]);

		expect(message?.parts).toEqual([
			{ type: "text", text: "Hello" },
			{
				type: "tool",
				id: "t1",
				name: "echo",
				input: {},
				status: "complete",
				output: { ok: true },
			},
			{ type: "widget", key: "chart", version: 1, data: {} },
		]);
	});

	it("clears a turn that restarts after a hand-off", () => {
		const messages = apply([
			{ type: "start", runId: "run", messageId: "m1" },
			{ type: "text-delta", messageId: "m1", text: "Partial" },
			{ type: "start", runId: "run", messageId: "m1" },
			{ type: "text-delta", messageId: "m1", text: "Whole" },
		]);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.parts).toEqual([{ type: "text", text: "Whole" }]);
	});

	it("replaces or inserts a watched message by position", () => {
		const message = (id: string, position: number, text: string) =>
			({
				id,
				conversationId,
				runId: "run",
				position,
				role: "assistant",
				parts: [{ type: "text", text }],
				createdAt: "",
			}) satisfies AgentMessage;
		const messages = apply(
			[
				{ type: "message", message: message("m2", 2, "Second") },
				{ type: "message", message: message("m1", 1, "Updated") },
			],
			[message("m1", 1, "First"), message("m3", 3, "Third")],
		);

		expect(messages.map((item) => item.parts)).toEqual([
			[{ type: "text", text: "Updated" }],
			[{ type: "text", text: "Second" }],
			[{ type: "text", text: "Third" }],
		]);
	});
});

describe("findPendingQuestion", () => {
	it("finds the unanswered question of the waiting run", () => {
		const messages = apply([
			{ type: "start", runId: "run", messageId: "m1" },
			{
				type: "question",
				messageId: "m1",
				runId: "run",
				id: "q1",
				kind: "approval",
				question: "Publish?",
			},
		]);

		expect(findPendingQuestion(messages, "run")).toMatchObject({
			runId: "run",
			id: "q1",
			kind: "approval",
		});
		expect(findPendingQuestion(messages, "other")).toBeUndefined();
	});
});

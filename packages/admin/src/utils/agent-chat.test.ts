import type { AgentMessage, AgentRunStatus, AgentStreamEvent } from "@types";
import { describe, expect, it } from "vitest";
import {
	applyStreamEvent,
	awaitsDelivery,
	findPendingQuestion,
	placeCompactions,
} from "./agent-chat";

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

describe("placeCompactions", () => {
	it("marks each compaction before the next message, or after the last", () => {
		const message = (id: string, createdAt: string): AgentMessage => ({
			id,
			conversationId,
			runId: null,
			position: 1,
			role: "user",
			parts: [],
			createdAt,
		});
		const placed = placeCompactions(
			[
				message("a", "2026-01-01T10:00:00.000Z"),
				message("b", "2026-01-01T11:00:00.000Z"),
			],
			[
				{ id: "c1", createdAt: "2026-01-01T10:30:00.000Z" },
				{ id: "c2", createdAt: "2026-01-01T12:00:00.000Z" },
			],
		);

		expect([...placed.before]).toEqual(["b"]);
		expect(placed.trailing).toBe(true);
	});
});

it("a skipped tool dismisses its approval and steering receipts deduplicate on reconnect", () => {
	const before = apply([
		{ type: "start", runId: "run", messageId: "assistant" },
		{
			type: "question",
			runId: "run",
			messageId: "assistant",
			id: "write",
			kind: "approval",
			question: "Approve?",
		},
	]);
	const skipped = apply(
		[
			{
				type: "tool",
				messageId: "assistant",
				id: "write",
				name: "write",
				input: {},
				status: "skipped",
				output: { skipped: true },
			},
		],
		before,
	);
	expect(findPendingQuestion(skipped, "run")).toBeUndefined();
	const event: AgentStreamEvent = {
		type: "message",
		message: {
			id: "correction",
			conversationId,
			runId: "run",
			position: 2,
			role: "user",
			parts: [{ type: "text", text: "Explain instead" }],
			createdAt: "2026-09-26T00:00:00.000Z",
		},
	};
	expect(apply([event, event], skipped).map((message) => message.id)).toEqual([
		"assistant",
		"correction",
	]);
});

describe("awaitsDelivery", () => {
	const queued = { id: "input", text: "Next", status: "pending" as const };
	const run = (status: AgentRunStatus) => ({
		id: "run",
		status,
		outcome: null,
		errorMessage: null,
	});

	it("checks back only while the server owes the chat a new run", () => {
		const inputs = [{ ...queued, delivery: { kind: "queue" as const } }];
		expect(
			awaitsDelivery({
				inputs,
				queuePaused: false,
				latestRun: run("completed"),
			}),
		).toBe(true);
		//* a stream follows a working run, and a paused queue waits for the user
		expect(
			awaitsDelivery({ inputs, queuePaused: false, latestRun: run("running") }),
		).toBe(false);
		expect(
			awaitsDelivery({
				inputs,
				queuePaused: true,
				latestRun: run("completed"),
			}),
		).toBe(false);
		//* a waiting run only continues when it is steered
		expect(
			awaitsDelivery({ inputs, queuePaused: false, latestRun: run("waiting") }),
		).toBe(false);
		expect(
			awaitsDelivery({
				inputs: [
					{ ...queued, delivery: { kind: "steer", targetRunId: "run" } },
				],
				queuePaused: false,
				latestRun: run("waiting"),
			}),
		).toBe(true);
	});
});

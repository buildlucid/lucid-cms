import type {
	AgentInteraction,
	AgentMessage,
	AgentRunStatus,
	AgentStreamEvent,
} from "@types";
import { describe, expect, it, vi } from "vitest";
import {
	applyStreamEvent,
	awaitsDelivery,
	findPendingInteraction,
	messageText,
	partLayout,
	placeCompactions,
	shouldPollTitle,
} from "./agent-chat";
import { isToolRow } from "./agent-tools";

const conversationId = "conversation";
const apply = (events: AgentStreamEvent[], messages: AgentMessage[] = []) =>
	events.reduce(
		(current, event) => applyStreamEvent(current, event, conversationId),
		messages,
	);

it("polls only for a recent, pending automatic title", () => {
	const now = Date.now();
	const clock = vi.spyOn(Date, "now").mockReturnValue(now);
	try {
		const pending = {
			titleStatus: "provisional" as const,
			titleGenerationRequestedAt: new Date(now - 59_000).toISOString(),
		};
		expect(shouldPollTitle(pending)).toBe(true);
		expect(
			shouldPollTitle({
				...pending,
				titleGenerationRequestedAt: new Date(now - 60_000).toISOString(),
			}),
		).toBe(false);
		expect(shouldPollTitle({ ...pending, titleStatus: "user_set" })).toBe(
			false,
		);
		expect(
			shouldPollTitle({ ...pending, titleGenerationRequestedAt: null }),
		).toBe(false);
	} finally {
		clock.mockRestore();
	}
});

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
				title: { type: "lucid.literal", value: "Echo" },
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
				title: { type: "lucid.literal", value: "Echo" },
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

describe("partLayout", () => {
	const interaction = (
		placement: AgentInteraction["placement"],
		status: "pending" | "answered",
	) =>
		({
			id: "i1",
			toolCallId: "t1",
			title: "Choose",
			placement,
			...(status === "answered" ? { status, response: {} } : { status }),
		}) satisfies AgentInteraction;
	const widget = {
		type: "widget",
		key: "picker",
		version: 1,
		data: {},
	} as const;
	const noRows = () => false;

	it("hides a question's tool call, so rows either side of it still join up", () => {
		expect(
			partLayout(
				{
					type: "tool",
					id: "t1",
					name: "lucid_ask_user",
					input: {},
					status: "complete",
				},
				noRows,
			),
		).toBe("hidden");
	});

	it("shows a completed progress call as text, outside the tool rows", () => {
		const progress = {
			type: "tool",
			id: "p1",
			name: "lucid_share_progress",
			input: { message: "I checked the pages." },
			status: "complete",
		} as const;
		expect(partLayout({ ...progress, status: "pending" }, noRows)).toBe(
			"hidden",
		);
		expect(partLayout(progress, noRows)).toBe("block");
		expect(isToolRow(progress)).toBe(false);
		expect(messageText({ parts: [progress] })).toBe("I checked the pages.");
	});

	it("shows a pending inline interaction as a form, and any other as a row", () => {
		expect(
			partLayout(
				{ ...widget, interaction: interaction("inline", "pending") },
				noRows,
			),
		).toBe("block");
		expect(
			partLayout(
				{ ...widget, interaction: interaction("inline", "answered") },
				noRows,
			),
		).toBe("row");
		expect(
			partLayout(
				{ ...widget, interaction: interaction("composer", "pending") },
				noRows,
			),
		).toBe("row");
	});

	it("shows a result widget as a row only when one is registered", () => {
		expect(partLayout(widget, noRows)).toBe("block");
		expect(partLayout(widget, () => true)).toBe("row");
	});
});

describe("findPendingInteraction", () => {
	it("finds the unanswered question of the waiting run", () => {
		const messages = apply([
			{ type: "start", runId: "run", messageId: "m1" },
			{
				type: "widget",
				messageId: "m1",
				key: "lucid-approval",
				version: 1,
				data: { question: "Publish?" },
				interaction: {
					id: "q1",
					toolCallId: "write",
					title: "Publish?",
					placement: "composer",
					status: "pending",
				},
			},
		]);

		expect(findPendingInteraction(messages, "run")).toMatchObject({
			runId: "run",
			id: "q1",
		});
		expect(findPendingInteraction(messages, "other")).toBeUndefined();
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
			type: "widget",
			messageId: "assistant",
			key: "lucid-approval",
			version: 1,
			data: { question: "Approve?" },
			interaction: {
				id: "approval",
				toolCallId: "write",
				title: "Approve?",
				placement: "composer",
				status: "pending",
			},
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
	expect(findPendingInteraction(skipped, "run")).toBeUndefined();
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
	const queued = {
		id: "input",
		text: "Next",
		references: [],
		status: "pending" as const,
	};
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

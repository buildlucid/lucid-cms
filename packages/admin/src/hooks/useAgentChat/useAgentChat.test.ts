import type { AgentConversation, AgentMessage } from "@types";
import { createRoot } from "solid-js";
import { expect, test, vi } from "vitest";
import type streamRun from "@/services/api/agent/stream-run";
import useAgentChat from "./useAgentChat";

const mocks = vi.hoisted(() => ({
	stream: vi.fn<typeof streamRun>(),
	refresh: vi.fn(async () => undefined),
}));
vi.mock("@tanstack/solid-query", () => ({
	useQueryClient: () => ({ invalidateQueries: mocks.refresh }),
}));
vi.mock("@/services/api", async () => ({
	default: {
		agent: {
			runStreamUrls: (
				await vi.importActual<typeof import("@/services/api/agent/stream-run")>(
					"@/services/api/agent/stream-run",
				)
			).runStreamUrls,
			useGetConversation: () => ({
				isSuccess: true,
				data: { data: conversation },
			}),
			useGetMessages: () => ({
				query: { isSuccess: true, data: { pages: [{ data: [message] }] } },
				refreshLatest: mocks.refresh,
			}),
			useCancelRun: () => ({ action: { mutateAsync: vi.fn() } }),
			streamRun: mocks.stream,
		},
	},
}));

const conversation: AgentConversation = {
	id: "conversation",
	agentKey: "test",
	title: "Test",
	titleStatus: "generated",
	titleGenerationRequestedAt: null,
	userId: 1,
	routineId: null,
	latestRun: {
		id: "run",
		status: "waiting",
		outcome: null,
		errorMessage: null,
	},
	queuePaused: false,
	approvalMode: "tool-defaults",
	modelSelection: null,
	inputs: [],
	context: null,
	createdAt: null,
	updatedAt: null,
};
const widget = {
	type: "widget" as const,
	key: "picker",
	version: 1,
	data: {},
	interaction: {
		id: "selection",
		toolCallId: "call",
		title: "Choose",
		placement: "composer" as const,
		status: "pending" as const,
	},
};
const message: AgentMessage = {
	id: "message",
	conversationId: "conversation",
	runId: "run",
	position: 1,
	role: "assistant",
	parts: [widget],
	createdAt: null,
};

test("an open stream does not dismiss a form whose response the server rejects", async () => {
	const ended = Promise.withResolvers<void>();
	mocks.stream.mockReset().mockReturnValue(ended.promise);
	const { chat, dispose } = createRoot((dispose) => ({
		chat: useAgentChat(() => "conversation"),
		dispose,
	}));
	try {
		const result = chat.respond({ runId: "run", id: "selection" }, { id: 9 });
		const stream = mocks.stream.mock.calls[0]?.[0];
		if (!stream) return expect.fail("Missing response stream");
		stream.onAccepted?.();
		expect(chat.pendingInteraction()?.id).toBe("selection");
		stream.onEvent({
			type: "error",
			message: "Choose one of the listed documents",
		});
		ended.resolve();
		expect(await result).toEqual({
			error: "Choose one of the listed documents",
		});
		expect(chat.pendingInteraction()?.id).toBe("selection");
	} finally {
		dispose();
	}
});

test.each([
	"widget",
	"snapshot",
])("a saved response received as a %s releases the form before the remaining model stream finishes", async (delivery) => {
	const ended = Promise.withResolvers<void>();
	mocks.stream.mockReset().mockReturnValue(ended.promise);
	const { chat, dispose } = createRoot((dispose) => ({
		chat: useAgentChat(() => "conversation"),
		dispose,
	}));
	try {
		const result = chat.respond({ runId: "run", id: "selection" }, { id: 1 });
		const stream = mocks.stream.mock.calls[0]?.[0];
		if (!stream) return expect.fail("Missing response stream");
		stream.onAccepted?.();
		const answered = {
			...widget,
			interaction: {
				...widget.interaction,
				status: "answered" as const,
				response: { id: 1 },
			},
		};
		stream.onEvent(
			delivery === "widget"
				? { ...answered, messageId: "message" }
				: { type: "message", message: { ...message, parts: [answered] } },
		);
		expect(await result).toEqual({ error: undefined });
		expect(chat.pendingInteraction()).toBeUndefined();
		expect(chat.streaming()).toBe(true);
	} finally {
		ended.resolve();
		dispose();
	}
});

test("retrying the same text with different references creates a new submission", async () => {
	const previousRun = conversation.latestRun;
	conversation.latestRun = null;
	mocks.stream.mockReset().mockResolvedValue(undefined);
	const { chat, dispose } = createRoot((dispose) => ({
		chat: useAgentChat(() => "conversation"),
		dispose,
	}));
	try {
		const first = [
			{
				type: "media" as const,
				mediaId: 12,
				label: "Hero",
				mimeType: "image/png",
			},
		];
		expect(await chat.send("Review this", "send", first)).toBe(false);
		await Promise.resolve();
		expect(await chat.send("Review this", "send", first)).toBe(false);
		await Promise.resolve();
		expect(
			await chat.send("Review this", "send", [
				{ type: "media", mediaId: 13, label: "Logo" },
			]),
		).toBe(false);
		const bodies = mocks.stream.mock.calls.map(([request]) => request.body);
		//* the server gets identities only; labels are for the optimistic message
		expect(bodies[0]?.references).toEqual([{ type: "media", mediaId: 12 }]);
		expect(bodies[1]?.requestId).toBe(bodies[0]?.requestId);
		expect(bodies[2]?.requestId).not.toBe(bodies[0]?.requestId);
	} finally {
		conversation.latestRun = previousRun;
		dispose();
	}
});

test("ordinary tools do not refresh references, and repeated watch snapshots refresh each relevant call once", async () => {
	const ended = Promise.withResolvers<void>();
	mocks.stream.mockReset().mockReturnValue(ended.promise);
	mocks.refresh.mockClear();
	const { chat, dispose } = createRoot((dispose) => ({
		chat: useAgentChat(() => "conversation"),
		dispose,
	}));
	try {
		void chat.respond({ runId: "run", id: "selection" }, { id: 1 });
		const stream = mocks.stream.mock.calls[0]?.[0];
		if (!stream) return expect.fail("Missing response stream");
		stream.onEvent({ type: "start", runId: "run", messageId: "reply" });
		expect(mocks.refresh).toHaveBeenCalledTimes(2);
		stream.onEvent({
			type: "tool",
			messageId: "reply",
			id: "read",
			name: "documents_get",
			status: "complete",
			detailsAvailable: true,
		});
		expect(mocks.refresh).toHaveBeenCalledTimes(2);
		const reference = {
			type: "tool" as const,
			id: "reference",
			name: "lucid_register_references",
			status: "complete" as const,
			detailsAvailable: true,
		};
		for (let index = 0; index < 3; index++) {
			stream.onEvent({
				type: "message",
				message: {
					...message,
					id: "reply",
					parts: [reference, { type: "text", text: String(index) }],
				},
			});
		}
		expect(mocks.refresh).toHaveBeenCalledTimes(3);
		stream.onEvent({
			type: "tool",
			messageId: "reply",
			id: "search",
			name: "web_search",
			status: "complete",
			detailsAvailable: true,
		});
		expect(mocks.refresh).toHaveBeenCalledTimes(4);
		for (let index = 0; index < 3; index++) {
			stream.onEvent({
				type: "message",
				message: {
					...message,
					id: "steer",
					role: "user",
					parts: [
						{
							type: "reference",
							reference: { type: "media", mediaId: 12, label: "Hero" },
						},
					],
				},
			});
		}
		expect(mocks.refresh).toHaveBeenCalledTimes(5);
	} finally {
		ended.resolve();
		dispose();
	}
});

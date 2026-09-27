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
vi.mock("@/services/api", () => ({
	default: {
		agent: {
			useGetConversation: () => ({
				isSuccess: true,
				data: { data: conversation },
			}),
			useGetMessages: () => ({
				isSuccess: true,
				data: { pages: [{ data: [message] }] },
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

test("a saved response releases the form before the remaining model stream finishes", async () => {
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
		stream.onEvent({
			messageId: "message",
			...widget,
			interaction: {
				...widget.interaction,
				status: "answered",
				response: { id: 1 },
			},
		});
		expect(await result).toEqual({ error: undefined });
		expect(chat.pendingInteraction()).toBeUndefined();
		expect(chat.streaming()).toBe(true);
	} finally {
		ended.resolve();
		dispose();
	}
});

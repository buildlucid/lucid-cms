import type { AgentStreamEvent } from "@types";
import { afterEach, expect, test, vi } from "vitest";
import { LucidError } from "@/utils/error-handling";
import { sendRequest } from "@/utils/request";
import streamRun, { runStreamUrls } from "./stream-run";

vi.mock("@/utils/request", () => ({ sendRequest: vi.fn() }));
afterEach(() => {
	vi.mocked(sendRequest).mockReset();
	vi.useRealTimers();
});

const response = (chunks: string[], runId = "run") =>
	new Response(
		new ReadableStream<Uint8Array>({
			start(controller) {
				for (const chunk of chunks)
					controller.enqueue(new TextEncoder().encode(chunk));
				controller.close();
			},
		}),
		{ headers: { "X-Lucid-Agent-Run-ID": runId } },
	);
const sse = (event: AgentStreamEvent, id?: string) =>
	`${id ? `id: ${id}\n` : ""}data: ${JSON.stringify(event)}\n\n`;
const finish: AgentStreamEvent = {
	type: "finish",
	runId: "run",
	status: "completed",
};

test("an incomplete POST reconnects with the last applied cursor and preserves the next run", async () => {
	const delta: AgentStreamEvent = {
		type: "text-delta",
		messageId: "message",
		text: "Hello",
	};
	const wire = sse(delta, "live:epoch:1");
	vi.mocked(sendRequest)
		.mockResolvedValueOnce(
			response([
				wire.slice(0, 11),
				wire.slice(11),
				'data: {"type":"text-delta"',
			]),
		)
		.mockResolvedValueOnce(
			response([
				sse(delta, "live:epoch:1"),
				sse({ ...delta, text: " world" }, "live:epoch:2"),
				sse(finish, "live:epoch:3"),
				sse({ type: "next", runId: "next-run" }, "live:epoch:4"),
			]),
		);
	const events: AgentStreamEvent[] = [];
	const accepted = vi.fn();
	await streamRun({
		url: runStreamUrls.send("chat"),
		body: { text: "Hello" },
		signal: new AbortController().signal,
		onAccepted: accepted,
		onEvent: (event) => events.push(event),
	});
	expect(events).toEqual([
		delta,
		{ ...delta, text: " world" },
		finish,
		{ type: "next", runId: "next-run" },
	]);
	expect(accepted).toHaveBeenCalledTimes(1);
	expect(sendRequest).toHaveBeenCalledTimes(2);
	expect(vi.mocked(sendRequest).mock.calls[1]?.[0]).toMatchObject({
		url: runStreamUrls.watch("run"),
		method: "GET",
		body: undefined,
		headers: { "Last-Event-ID": "live:epoch:1" },
		displayErrorToast: false,
	});
});

test("a disconnect before the first event recovers the accepted run from snapshots", async () => {
	vi.mocked(sendRequest)
		.mockResolvedValueOnce(response([]))
		.mockResolvedValueOnce(response([sse(finish)]));
	const events = vi.fn();
	await streamRun({
		url: runStreamUrls.send("chat"),
		body: { requestId: "run" },
		signal: new AbortController().signal,
		onEvent: events,
	});
	expect(events).toHaveBeenCalledWith(finish);
	expect(vi.mocked(sendRequest).mock.calls[1]?.[0]).toMatchObject({
		method: "GET",
		url: runStreamUrls.watch("run"),
	});
	expect(vi.mocked(sendRequest).mock.calls[1]?.[0].headers).not.toHaveProperty(
		"Last-Event-ID",
	);
});

test("recovery stops on an access error and never retries an unaccepted POST", async () => {
	const denied = new LucidError("Denied", {
		status: 403,
		name: "Denied",
		message: "Denied",
	});
	vi.mocked(sendRequest)
		.mockResolvedValueOnce(response([]))
		.mockRejectedValueOnce(denied);
	await expect(
		streamRun({
			url: runStreamUrls.watch("run"),
			signal: new AbortController().signal,
			onEvent: vi.fn(),
		}),
	).rejects.toBe(denied);
	expect(sendRequest).toHaveBeenCalledTimes(2);
	vi.mocked(sendRequest)
		.mockReset()
		.mockRejectedValueOnce(new TypeError("Disconnected"));
	await expect(
		streamRun({
			url: runStreamUrls.send("chat"),
			body: {},
			signal: new AbortController().signal,
			onEvent: vi.fn(),
		}),
	).rejects.toThrow("Disconnected");
	expect(sendRequest).toHaveBeenCalledTimes(1);
});

test("aborting a viewer cancels its reader without opening another connection", async () => {
	const controller = new AbortController();
	const cancelled = vi.fn();
	vi.mocked(sendRequest).mockResolvedValueOnce(
		new Response(
			new ReadableStream<Uint8Array>({
				start(stream) {
					stream.enqueue(
						new TextEncoder().encode(
							sse(
								{ type: "start", runId: "run", messageId: "message" },
								"first",
							),
						),
					);
				},
				cancel: cancelled,
			}),
			{ headers: { "X-Lucid-Agent-Run-ID": "run" } },
		),
	);
	await expect(
		streamRun({
			url: runStreamUrls.watch("run"),
			signal: controller.signal,
			onEvent: () => controller.abort(),
		}),
	).rejects.toMatchObject({ name: "AbortError" });
	expect(cancelled).toHaveBeenCalledTimes(1);
	expect(sendRequest).toHaveBeenCalledTimes(1);
});

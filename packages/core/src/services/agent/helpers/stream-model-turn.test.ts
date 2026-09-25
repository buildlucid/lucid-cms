import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import type { ModelEvent } from "../../../libs/agent/types.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import streamModelTurn from "./stream-model-turn.js";

vi.mock("../../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "test-token", lucidRemoteConnectionId: 1 },
	}),
}));
const testConfig = getTestConfig();
let context: ServiceContext;
beforeAll(async () => {
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});
afterAll(() => testConfig.destroy());
afterEach(() => vi.unstubAllGlobals());
const usage = {
	model: "test",
	tokens: {
		input: {
			text: 1,
			image: 0,
			audio: 0,
			cached: { total: 0, text: 0, image: 0, audio: 0 },
			total: 1,
		},
		output: {
			text: 1,
			image: 0,
			audio: 0,
			reasoning: 0,
			acceptedPrediction: 0,
			rejectedPrediction: 0,
			total: 1,
		},
		total: 2,
	},
	cost: { creditsCharged: "0.0001" },
};
const encode = new TextEncoder();

test("forwards fragmented SSE text before the response completes", async () => {
	const requestId = randomUUID();
	let finish: () => void = () => {};
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encode.encode('data: {"type":"text-delta","te'));
			controller.enqueue(encode.encode('xt":"First paragraph."}\r\n\r\n'));
			finish = () => {
				controller.enqueue(
					encode.encode(
						`data: ${JSON.stringify({ type: "finish", requestId, usage })}\n\n`,
					),
				);
				controller.close();
			};
		},
	});
	const pending = vi.fn(async () => ({ error: undefined, data: undefined }));
	const fetch = vi.fn(
		async () =>
			new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
	);
	vi.stubGlobal("fetch", fetch);
	const events: ModelEvent[] = [];
	let received: () => void = () => {};
	const first = new Promise<void>((resolve) => {
		received = resolve;
	});
	const result = streamModelTurn(context, {
		requestId,
		messages: [{ role: "user", content: "Hi" }],
		instructions: "Test",
		tools: [],
		signal: new AbortController().signal,
		onRequest: pending,
		emit: async (event) => {
			events.push(event);
			received();
		},
	});
	await first;
	expect(events).toEqual([{ type: "text-delta", text: "First paragraph." }]);
	expect(pending).toHaveBeenCalledWith(1);
	expect(fetch.mock.invocationCallOrder[0]).toBeGreaterThan(
		pending.mock.invocationCallOrder[0] ?? 0,
	);
	finish();
	expect(await result).toMatchObject({
		error: undefined,
		data: { usage, connectionId: 1 },
	});
});

test("rejects a truncated response instead of treating it as completion", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response('data: {"type":"text-delta","text":"Partial"}\n\n', {
					headers: { "Content-Type": "text/event-stream" },
				}),
		),
	);
	const result = await streamModelTurn(context, {
		requestId: randomUUID(),
		messages: [],
		instructions: "Test",
		tools: [],
		signal: new AbortController().signal,
		emit: async () => {},
	});
	expect(result.error?.status).toBe(502);
	expect(result.data).toBeUndefined();
});

test("marks a durable model failure as terminal", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response('data: {"type":"error","message":"Provider failed"}\n\n', {
					headers: { "Content-Type": "text/event-stream" },
				}),
		),
	);
	const result = await streamModelTurn(context, {
		requestId: randomUUID(),
		messages: [],
		instructions: "Test",
		tools: [],
		signal: new AbortController().signal,
		emit: async () => {},
	});
	expect(result.error?.key).toBe("agent_model_failed");
});

test("finishes on the terminal event without waiting for the connection to close", async () => {
	const requestId = randomUUID();
	const cancel = vi.fn();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(
				encode.encode(
					`data: ${JSON.stringify({ type: "finish", requestId, usage })}\n\n`,
				),
			);
		},
		cancel,
	});
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response(body, {
					headers: { "Content-Type": "text/event-stream" },
				}),
		),
	);
	const result = await streamModelTurn(context, {
		requestId,
		messages: [],
		instructions: "Test",
		tools: [],
		signal: new AbortController().signal,
		emit: async () => {},
	});
	expect(result.error).toBeUndefined();
	expect(cancel).toHaveBeenCalled();
});

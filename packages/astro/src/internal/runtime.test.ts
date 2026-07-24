import { describe, expect, test, vi } from "vitest";
import {
	destroyInvocationScopes,
	destroyRuntimeHostRevision,
	getInvocationStore,
	getOrCreateRuntimeHost,
	getRuntimeHostState,
	hasInvocationScopes,
	withResponseCleanup,
} from "./runtime.js";

describe("Astro invocation lifecycle", () => {
	test("reuses invocations only within the same Astro locals object", () => {
		const firstRequest = {};
		const secondRequest = {};
		expect(hasInvocationScopes(firstRequest)).toBe(false);

		const firstStore = getInvocationStore(
			firstRequest,
			"lucid-project",
			"revision-a",
		);
		const repeatedStore = getInvocationStore(
			firstRequest,
			"lucid-project",
			"revision-a",
		);
		const secondStore = getInvocationStore(
			secondRequest,
			"lucid-project",
			"revision-a",
		);

		expect(repeatedStore).toBe(firstStore);
		expect(secondStore).not.toBe(firstStore);
		expect(hasInvocationScopes(firstRequest)).toBe(true);
	});

	test("separates project revisions within one request", () => {
		const locals = {};
		const firstStore = getInvocationStore(
			locals,
			"lucid-project",
			"revision-a",
		);
		const nextStore = getInvocationStore(locals, "lucid-project", "revision-b");

		expect(nextStore).not.toBe(firstStore);
	});

	test("separates multiple Lucid projects within one request", () => {
		const locals = {};
		const firstStore = getInvocationStore(
			locals,
			"first-project",
			"revision-a",
		);
		const secondStore = getInvocationStore(
			locals,
			"second-project",
			"revision-a",
		);

		expect(secondStore).not.toBe(firstStore);
	});

	test("destroys every invocation created for a request exactly once", async () => {
		const locals = {};
		const destroy = vi.fn();
		getInvocationStore(locals, "lucid-project", "revision-a").set(
			"default",
			Promise.resolve({ destroy }),
		);

		await destroyInvocationScopes(locals);
		await destroyInvocationScopes(locals);

		expect(destroy).toHaveBeenCalledOnce();
	});

	test("keeps request resources alive until a streamed response finishes", async () => {
		const cleanup = vi.fn();
		const response = await withResponseCleanup(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode("lucid"));
						controller.close();
					},
				}),
			),
			cleanup,
		);

		expect(cleanup).not.toHaveBeenCalled();
		expect(await response.text()).toBe("lucid");
		expect(cleanup).toHaveBeenCalledOnce();
	});

	test("releases request resources when a response stream is cancelled", async () => {
		const cleanup = vi.fn();
		const response = await withResponseCleanup(
			new Response(new ReadableStream()),
			cleanup,
		);

		await response.body?.cancel();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	test("releases request resources immediately for responses without a body", async () => {
		const cleanup = vi.fn();
		await withResponseCleanup(new Response(null), cleanup);

		expect(cleanup).toHaveBeenCalledOnce();
	});

	test("preserves response metadata and platform properties", async () => {
		const original = new Response("lucid");
		Object.defineProperties(original, {
			platform: {
				value: "cloudflare",
			},
			url: {
				value: "https://example.com/lucid",
			},
		});

		const response = await withResponseCleanup(original, vi.fn());

		expect(response.url).toBe("https://example.com/lucid");
		expect((response as Response & { platform: string }).platform).toBe(
			"cloudflare",
		);
	});

	test("releases request resources when a response stream fails", async () => {
		const cleanup = vi.fn();
		const response = await withResponseCleanup(
			new Response(
				new ReadableStream({
					pull(controller) {
						controller.error(new Error("stream failed"));
					},
				}),
			),
			cleanup,
		);

		await expect(response.text()).rejects.toThrow("stream failed");
		expect(cleanup).toHaveBeenCalledOnce();
	});
});

describe("Astro runtime host lifecycle", () => {
	test("publishes one completed host for concurrent initialization", async () => {
		const hostKey = `runtime-test-${crypto.randomUUID()}`;
		const state = getRuntimeHostState(hostKey, "revision-a");
		const destroy = vi.fn();
		const create = vi.fn(async () => {
			await Promise.resolve();
			return { destroy };
		});

		const [first, second] = await Promise.all([
			getOrCreateRuntimeHost(state, "default", create),
			getOrCreateRuntimeHost(state, "default", create),
		]);

		expect(second).toBe(first);
		expect(create).toHaveBeenCalledOnce();
		await destroyRuntimeHostRevision(hostKey, state);
		expect(destroy).toHaveBeenCalledOnce();
	});
});

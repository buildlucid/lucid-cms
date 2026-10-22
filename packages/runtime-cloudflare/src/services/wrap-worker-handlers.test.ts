import type { LucidInvocation } from "@lucidcms/core/types";
import { expect, test, vi } from "vitest";
import wrapWorkerHandlers from "./wrap-worker-handlers.js";

test("destroys the event's invocation when its handler throws", async () => {
	const invocation = {
		destroy: vi.fn(async () => {}),
	} as unknown as LucidInvocation;
	const handler = vi.fn(async () => {
		throw new Error("Handler failed");
	});
	const handlers = wrapWorkerHandlers(
		{ queue: handler },
		async () => invocation,
	);
	const env = { LUCID_QUEUE: {} };
	const ctx = { waitUntil: () => {} };

	await expect(handlers.queue?.({ messages: [] }, env, ctx)).rejects.toThrow(
		"Handler failed",
	);
	expect(handler).toHaveBeenCalledWith({
		event: { messages: [] },
		env,
		ctx,
		invocation,
	});
	expect(invocation.destroy).toHaveBeenCalledOnce();
});

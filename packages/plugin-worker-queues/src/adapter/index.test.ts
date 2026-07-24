import type { AdapterLifecycleContext } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";

const workerState = vi.hoisted(() => ({
	instances: [] as Array<{
		emit(event: string, ...args: unknown[]): void;
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;
	}>,
}));

vi.mock("node:worker_threads", () => ({
	Worker: class {
		readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>();
		readonly postMessage = vi.fn();
		readonly terminate = vi.fn(async () => 0);

		constructor() {
			workerState.instances.push(this);
		}

		once(event: string, listener: (...args: unknown[]) => void) {
			const wrapped = (...args: unknown[]) => {
				this.off(event, wrapped);
				listener(...args);
			};
			this.on(event, wrapped);
			return this;
		}

		on(event: string, listener: (...args: unknown[]) => void) {
			const listeners = this.listeners.get(event) ?? new Set();
			listeners.add(listener);
			this.listeners.set(event, listeners);
			return this;
		}

		off(event: string, listener: (...args: unknown[]) => void) {
			this.listeners.get(event)?.delete(listener);
			return this;
		}

		emit(event: string, ...args: unknown[]) {
			for (const listener of this.listeners.get(event) ?? []) listener(...args);
		}
	},
}));

import workerQueueAdapter from "./index.js";

describe("worker queue adapter lifecycle", () => {
	test("waits for consumer cleanup before terminating the worker", async () => {
		const adapter = workerQueueAdapter();
		const context = {
			config: {
				build: {
					paths: {
						outDir: "/tmp/lucid-worker-test",
					},
				},
			},
			runtimeContext: {
				configEntryPoint: "config.js",
			},
		} as unknown as AdapterLifecycleContext;
		await adapter.lifecycle?.init?.(context);
		const worker = workerState.instances.at(-1);
		expect(worker).toBeDefined();

		const destroy = adapter.lifecycle?.destroy?.(context);
		expect(worker?.postMessage).toHaveBeenCalledWith({ type: "SHUTDOWN" });
		expect(worker?.terminate).not.toHaveBeenCalled();

		worker?.emit("message", { type: "SHUTDOWN_COMPLETE" });
		await destroy;

		expect(worker?.terminate).toHaveBeenCalledOnce();
	});
});

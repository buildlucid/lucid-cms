import { afterAll, describe, expect, test, vi } from "vitest";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getQueueAdapter from "./get-adapter.js";
import {
	destroyQueueAdapter,
	getInitializedQueueAdapter,
} from "./lifecycle.js";
import type { QueueAdapterInstance } from "./types.js";

const testConfig = getTestConfig();

afterAll(() => testConfig.destroy());

describe("queue adapter resolution", () => {
	test("uses inline execution when no adapter is configured", async () => {
		const queue = await getQueueAdapter({
			queue: {},
		});

		expect(queue.key).toBe("inline");
	});

	test("does not replace a failing configured adapter with inline execution", async () => {
		await expect(
			getQueueAdapter({
				queue: {
					adapter: async () => {
						throw new Error("Unavailable");
					},
				},
			}),
		).rejects.toThrow("The configured queue adapter could not be initialized.");
	});

	test("cleans up after adapter initialization errors", async () => {
		const destroy = vi.fn(async () => undefined);
		const adapter = {
			type: "queue-adapter",
			key: "failing-init",
			support: { delayedDelivery: false },
			lifecycle: {
				init: async () => {
					throw new Error("Unavailable");
				},
				destroy,
			},
			publish: async () => ({ error: undefined, data: undefined }),
		} satisfies QueueAdapterInstance;

		await expect(
			getInitializedQueueAdapter(await testConfig.getConfig(), { adapter }),
		).rejects.toThrow("Unavailable");
		expect(destroy).toHaveBeenCalledOnce();
	});

	test("propagates adapter shutdown errors", async () => {
		const adapter = {
			type: "queue-adapter",
			key: "failing-destroy",
			support: { delayedDelivery: false },
			lifecycle: {
				destroy: async () => {
					throw new Error("Unavailable");
				},
			},
			publish: async () => ({ error: undefined, data: undefined }),
		} satisfies QueueAdapterInstance;

		await expect(
			destroyQueueAdapter(adapter, {
				config: await testConfig.getConfig(),
			}),
		).rejects.toThrow("Unavailable");
	});
});

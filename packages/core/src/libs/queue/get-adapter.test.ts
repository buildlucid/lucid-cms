import { describe, expect, test } from "vitest";
import getQueueAdapter from "./get-adapter.js";

describe("queue adapter resolution", () => {
	test("falls back to inline execution when the configured adapter fails", async () => {
		const queue = await getQueueAdapter({
			queue: {
				jobs: [],
				retention: { completedDays: 7, failedDays: 30 },
				adapter: async () => {
					throw new Error("Unavailable");
				},
			},
		});

		expect(queue.key).toBe("inline");
	});
});

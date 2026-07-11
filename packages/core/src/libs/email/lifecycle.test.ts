import { describe, expect, test, vi } from "vitest";
import {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "./lifecycle.js";
import type { EmailAdapterInstance } from "./types.js";

const createAdapter = (): EmailAdapterInstance => ({
	type: "email-adapter",
	key: "test",
	lifecycle: {
		init: vi.fn(),
		destroy: vi.fn(),
	},
	send: vi.fn(),
});

describe("email adapter lifecycle", () => {
	test("defaults lifecycle purpose to runtime", async () => {
		const adapter = createAdapter();

		await getInitializedEmailAdapter({
			email: { adapter },
		} as never);

		expect(adapter.lifecycle?.init).toHaveBeenCalledWith(
			expect.objectContaining({ purpose: "runtime" }),
		);
	});

	test("passes lifecycle purpose through initialization and destruction", async () => {
		const adapter = createAdapter();
		const config = {
			email: { adapter },
		} as never;

		await getInitializedEmailAdapter(config, {
			purpose: "queue-consumer",
		});
		await destroyEmailAdapter(adapter, {
			config,
			purpose: "queue-consumer",
		});

		expect(adapter.lifecycle?.init).toHaveBeenCalledWith(
			expect.objectContaining({ purpose: "queue-consumer" }),
		);
		expect(adapter.lifecycle?.destroy).toHaveBeenCalledWith(
			expect.objectContaining({ purpose: "queue-consumer" }),
		);
	});
});

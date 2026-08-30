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
	test("initializes and destroys a supplied adapter", async () => {
		const adapter = createAdapter();
		const config = { email: {} } as never;

		await getInitializedEmailAdapter(config, {
			adapter,
		});
		await destroyEmailAdapter(adapter, { config });

		expect(adapter.lifecycle?.init).toHaveBeenCalledOnce();
		expect(adapter.lifecycle?.destroy).toHaveBeenCalledOnce();
	});
});

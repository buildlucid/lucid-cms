import { afterEach, describe, expect, test, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import getEnvVars from "./get-env-vars.js";

vi.mock("wrangler", () => ({
	getPlatformProxy: vi.fn(),
}));

const platformProxySignalListener = vi.fn();

const logger = {
	instance: {
		info: vi.fn(),
		color: {
			blue: (value: string) => value,
		},
	},
	silent: true,
} as never;

describe("getEnvVars", () => {
	afterEach(() => {
		process.removeListener("SIGINT", platformProxySignalListener);
		vi.clearAllMocks();
	});

	test("removes signal listeners added by the platform proxy", async () => {
		const existingSignalListener = vi.fn();
		process.on("SIGINT", existingSignalListener);
		vi.mocked(getPlatformProxy).mockImplementation(async () => {
			process.on("SIGINT", platformProxySignalListener);
			return {
				env: {},
				dispose: vi.fn(),
			} as never;
		});

		try {
			await getEnvVars({ logger });

			expect(process.listeners("SIGINT")).toContain(existingSignalListener);
			expect(process.listeners("SIGINT")).not.toContain(
				platformProxySignalListener,
			);
		} finally {
			process.removeListener("SIGINT", existingSignalListener);
		}
	});

	test("removes signal listeners when platform proxy startup fails", async () => {
		vi.mocked(getPlatformProxy).mockImplementation(async () => {
			process.on("SIGINT", platformProxySignalListener);
			throw new Error("Platform proxy failed");
		});

		await expect(getEnvVars({ logger })).rejects.toThrow(
			"Platform proxy failed",
		);
		expect(process.listeners("SIGINT")).not.toContain(
			platformProxySignalListener,
		);
	});
});

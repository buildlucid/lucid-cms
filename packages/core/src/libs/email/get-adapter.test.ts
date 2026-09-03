import { describe, expect, test } from "vitest";
import getEmailAdapter from "./get-adapter.js";

describe("email adapter resolution", () => {
	test("uses simulation when no adapter is configured", async () => {
		const adapter = await getEmailAdapter({ email: {} });

		expect(adapter.key).toBe("passthrough");
	});

	test("does not replace a failing configured adapter with simulation", async () => {
		await expect(
			getEmailAdapter({
				email: {
					adapter: async () => {
						throw new Error("Unavailable");
					},
				},
			}),
		).rejects.toThrow("The configured email adapter could not be initialized.");
	});
});

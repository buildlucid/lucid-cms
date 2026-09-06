import { afterEach, expect, test, vi } from "vitest";
import plugin from "./plugin.js";

afterEach(() => vi.unstubAllGlobals());

test("honours the final simulation setting before sending to Resend", async () => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	const defaults = plugin({ apiKey: "test-key" }).defaults;
	if (typeof defaults !== "function")
		throw new Error("Missing plugin defaults");
	const adapter = defaults({ email: { simulate: false } } as never).email
		?.adapter;
	if (!adapter || adapter instanceof Promise || typeof adapter === "function") {
		throw new Error("Missing email adapter");
	}
	const result = await adapter.send(
		{ config: { email: { simulate: true } } } as never,
		{
			to: "user@example.com",
			from: { name: "Sender", email: "sender@example.com" },
			subject: "Test",
			html: "<p>Test</p>",
			priority: "normal",
			data: {},
			template: "test",
		},
	);
	expect(result.success).toBe(true);
	expect(fetch).not.toHaveBeenCalled();
});

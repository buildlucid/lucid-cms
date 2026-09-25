import { expect, test } from "vitest";
import ConfigSchema from "./config-schema.js";

test("agent defaults on and accepts both forms of the config gate", () => {
	const config = ConfigSchema.pick({ ai: true });
	expect(config.parse({}).ai.agent).toEqual({ enabled: true });
	expect(config.parse({ ai: { agent: false } }).ai.agent).toEqual({
		enabled: false,
	});
	expect(config.parse({ ai: { agent: { enabled: false } } }).ai.agent).toEqual({
		enabled: false,
	});
	expect(config.parse({ ai: false }).ai.enabled).toBe(false);
});

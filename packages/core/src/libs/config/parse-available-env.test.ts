import { expect, test } from "vitest";
import z from "zod";
import parseAvailableEnv from "./parse-available-env.js";

test("applies defaults and coercion while keeping values that fail the schema", () => {
	const schema = z.object({
		PORT: z.coerce.number(),
		FEATURE: z.enum(["on", "off"]).default("on"),
		SECRET: z.string().length(64),
	});

	expect(
		parseAvailableEnv({ PORT: "8080", SECRET: "short", OTHER: "kept" }, schema),
	).toEqual({ PORT: 8080, FEATURE: "on", SECRET: "short", OTHER: "kept" });
});

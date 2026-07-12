import { expect, test } from "vitest";
import generateEnvTypes from "./env-type.js";

test("generates environment types from the named env export", async () => {
	const result = await generateEnvTypes({
		schema: {} as never,
		configRelativePath: "../lucid.config.ts",
	});

	expect(result.imports).toContain(
		'import type { env } from "../lucid.config.ts";',
	);
	expect(result.declarations).toBeUndefined();
	expect(result.moduleAugmentations[0]?.declarations).toContain(
		"interface EnvironmentVariables extends z.infer<typeof env> {}",
	);
});

test("generates fallback environment types without a named env export", async () => {
	const result = await generateEnvTypes({
		schema: undefined,
		configRelativePath: "../lucid.config.ts",
	});

	expect(result.imports).toBeUndefined();
	expect(result.declarations).toBeUndefined();
	expect(result.moduleAugmentations[0]?.declarations).toContain(
		"interface EnvironmentVariables extends Record<string, unknown> {}",
	);
});

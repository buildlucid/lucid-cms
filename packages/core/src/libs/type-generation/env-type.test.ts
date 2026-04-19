import { expect, test } from "vitest";
import generateEnvTypes from "./env-type.js";

test("generates environment types from the config definition export", async () => {
	const result = await generateEnvTypes({
		schema: {} as never,
		configRelativePath: "../lucid.config.ts",
	});

	expect(result.imports).toContain(
		'import type { env } from "../lucid.config.ts";',
	);
	expect(result.types).toContain(
		"interface EnvironmentVariables extends z.infer<typeof env> {}",
	);
});

import { expect, test } from "vitest";
import generateEnvTypes from "./env-type.js";

test("generates environment types from the config definition export", async () => {
	const result = await generateEnvTypes({
		schema: {} as never,
		configRelativePath: "../lucid.config.ts",
	});

	expect(result.imports).toContain(
		'import type * as lucidConfig from "../lucid.config.ts";',
	);
	expect(result.declarations).toContain(
		`type LucidGeneratedEnvSchema =
	typeof lucidConfig.default extends { env: infer TEnv }
		? TEnv
		: typeof lucidConfig extends { env: infer TEnv }
			? TEnv
			: never;`,
	);
	expect(result.moduleAugmentations[0]?.declarations).toContain(
		"interface EnvironmentVariables extends z.infer<LucidGeneratedEnvSchema> {}",
	);
});

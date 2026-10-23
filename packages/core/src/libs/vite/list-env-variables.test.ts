import { expect, test } from "vitest";
import z from "zod";
import listEnvVariables from "./list-env-variables.js";

test("lists a transformed schema's variables, with optional and defaulted ones not required", () => {
	const schema = z
		.object({
			SECRET: z.string(),
			PORT: z.coerce.number().default(6543),
			SENTRY_DSN: z.string().optional(),
		})
		.transform((env) => ({ ...env, port: env.PORT }));

	expect(listEnvVariables(schema)).toEqual([
		{ name: "SECRET", required: true },
		{ name: "PORT", required: false },
		{ name: "SENTRY_DSN", required: false },
	]);
});

import z from "zod";
import type { EnvironmentVariables } from "../runtime/types.js";

/** Parses available env values with schema defaults and coercion while preserving rejected values for Node config reads that may lack runtime secrets. */
const parseAvailableEnv = (
	env: Record<string, unknown> | undefined,
	schema: z.ZodType | undefined,
): EnvironmentVariables | undefined => {
	if (!schema) return env;
	if (!(schema instanceof z.ZodObject)) {
		const parsed = schema.safeParse(env ?? {});
		return parsed.success && parsed.data && typeof parsed.data === "object"
			? { ...env, ...parsed.data }
			: env;
	}

	const parsed: Record<string, unknown> = { ...env };
	for (const [key, field] of Object.entries(schema.shape)) {
		const result = field.safeParse(env?.[key]);
		if (result.success) parsed[key] = result.data;
	}

	return parsed;
};

export default parseAvailableEnv;

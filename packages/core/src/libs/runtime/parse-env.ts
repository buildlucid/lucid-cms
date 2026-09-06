import type z from "zod";
import LucidError from "../../utils/errors/lucid-error.js";
import type { EnvironmentVariables } from "./types.js";

/** Parses raw environment values while preserving platform bindings. */
const parseEnv = (
	env: Record<string, unknown> | undefined,
	schema: z.ZodType | undefined,
): EnvironmentVariables | undefined => {
	if (!schema) return env;
	const parsed: unknown = schema.parse(env ?? {});
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new LucidError({
			message: "The environment schema must return an object.",
		});
	}
	return { ...env, ...parsed };
};

export default parseEnv;

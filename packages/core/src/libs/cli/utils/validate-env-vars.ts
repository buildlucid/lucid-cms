import type { ZodType } from "zod/v4";
import cliLogger from "../logger.js";

/**
 * Validates the environment variables against the schema if present
 */
const validateEnvVars = async (props: {
	envSchema: ZodType | undefined;
	env: Record<string, unknown> | undefined;
}): Promise<boolean> => {
	const { envSchema, env } = props;

	if (!envSchema || !env) {
		return true;
	}

	try {
		envSchema.parse(env);
		return true;
	} catch (error) {
		if (error instanceof Error) cliLogger.errorInstance(error);

		return false;
	}
};

export default validateEnvVars;

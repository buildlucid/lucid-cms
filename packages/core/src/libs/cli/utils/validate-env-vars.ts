import type { ZodType } from "zod/v4";

/**
 * Validates the environment variables against the schema if present
 */
const validateEnvVars = async (props: {
	envSchema: ZodType | undefined;
	env: Record<string, unknown> | undefined;
}): Promise<{
	success: boolean;
	message?: string;
}> => {
	const { envSchema, env } = props;

	if (!envSchema || !env) {
		return {
			success: true,
		};
	}

	const result = envSchema.safeParse(env);

	if (!result.success) {
		return {
			success: false,
			message: result.error.message,
		};
	}

	return {
		success: true,
	};
};

export default validateEnvVars;

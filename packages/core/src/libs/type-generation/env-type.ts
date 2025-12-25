import type z from "zod";
import type { GenerateTypesResult } from "./types.js";
import constants from "../../constants/constants.js";

/**
 * Generates the EnvironmentVariables interface based on the provided schema
 */
const generateEnvTypes = async (props: {
	schema: z.ZodType | undefined;
	configRelativePath: string;
}): Promise<GenerateTypesResult> => {
	return {
		module: constants.typeGeneration.modules.coreTypes,
		types: props.schema
			? "interface EnvironmentVariables extends z.infer<typeof envSchema> {}"
			: "interface EnvironmentVariables extends Record<string, unknown> {}",
		imports: props.schema
			? `import type { envSchema } from "${props.configRelativePath}";
import type { z } from "@lucidcms/core";`
			: undefined,
	};
};

export default generateEnvTypes;

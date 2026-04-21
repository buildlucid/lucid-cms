import type z from "zod";
import constants from "../../constants/constants.js";
import type { TypeGenerationContribution } from "./types.js";

/**
 * Generates the EnvironmentVariables interface based on the provided schema
 */
const generateEnvTypes = async (props: {
	schema: z.ZodType | undefined;
	configRelativePath: string;
}): Promise<TypeGenerationContribution> => {
	return {
		imports: props.schema
			? [
					`import type { env } from "${props.configRelativePath}";`,
					'import type { z } from "@lucidcms/core";',
				]
			: undefined,
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					props.schema
						? "interface EnvironmentVariables extends z.infer<typeof env> {}"
						: "interface EnvironmentVariables extends Record<string, unknown> {}",
				],
			},
		],
	};
};

export default generateEnvTypes;

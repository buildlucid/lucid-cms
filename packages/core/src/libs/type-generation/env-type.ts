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
					`import type * as lucidConfig from "${props.configRelativePath}";`,
					'import type { z } from "@lucidcms/core";',
				]
			: undefined,
		declarations: props.schema
			? [
					`type LucidGeneratedEnvSchema =
	typeof lucidConfig.default extends { env: infer TEnv }
		? TEnv
		: typeof lucidConfig extends { env: infer TEnv }
			? TEnv
			: never;`,
				]
			: undefined,
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					props.schema
						? "interface EnvironmentVariables extends z.infer<LucidGeneratedEnvSchema> {}"
						: "interface EnvironmentVariables extends Record<string, unknown> {}",
				],
			},
		],
	};
};

export default generateEnvTypes;

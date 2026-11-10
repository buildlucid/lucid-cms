import type z from "zod";
import constants from "../../constants/constants.js";
import logger from "../logger/index.js";
import type { TypeGenerationContribution } from "./types.js";

/**
 * Generates EnvironmentVariables for `context.env`, referencing the config's `env` export so
 * schema edits need no regeneration.
 */
const generateEnvTypes = async (props: {
	schema: z.ZodType | undefined;
	/** Whether lucid.config exports the schema as `env`. */
	exported: boolean;
	configRelativePath: string;
}): Promise<TypeGenerationContribution> => {
	const typed = props.schema !== undefined && props.exported;
	if (props.schema && !props.exported) {
		logger.warn({
			message:
				"lucid.config passes an `env` schema that it does not export, so `context.env` stays untyped outside the config. Export it: `export const env = z.object({ ... })`.",
		});
	}

	return {
		imports: typed
			? [
					`import type { env } from "${props.configRelativePath}";`,
					'import type { z } from "@lucidcms/core";',
				]
			: undefined,
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					typed
						? "interface EnvironmentVariables extends z.infer<typeof env> {}"
						: "interface EnvironmentVariables extends Record<string, unknown> {}",
				],
			},
		],
	};
};

export default generateEnvTypes;

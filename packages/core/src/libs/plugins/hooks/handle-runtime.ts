import type {
	LucidConfigDefinition,
	RuntimeBuildArtifact,
} from "../../../libs/runtime/types.js";
import type { Config } from "../../../types/config.js";
import type { ServiceResponse } from "../../../types.js";
import cliLogger from "../../cli/logger.js";
import { copy, createTranslator } from "../../i18n/index.js";
import type { TranslationStore } from "../../i18n/types.js";

/**
 * Responsible for running the plugin runtime hooks and collecting artifacts.
 */
const handlePluginRuntimeHooks = async (props: {
	config: Config;
	translationStore: TranslationStore;
	definition: LucidConfigDefinition;
	silent?: boolean;
	configPath: string;
	outputPath: string;
	outputRelativeConfigPath: string;
}): ServiceResponse<RuntimeBuildArtifact[]> => {
	try {
		const pluginArtifacts: Array<RuntimeBuildArtifact> = [];
		const silent = props.silent ?? false;
		const translate = createTranslator({
			store: props.translationStore,
			locale: "en",
		});

		await Promise.all(
			props.config.plugins.map(async (plugin) => {
				if (!plugin.hooks?.runtime) {
					return;
				}
				const res = await plugin.hooks.runtime({
					definition: props.definition,
					paths: {
						configPath: props.configPath,
						outputPath: props.outputPath,
						outputRelativeConfigPath: props.outputRelativeConfigPath,
					},
				});
				if (res.error) {
					cliLogger.error(
						translate.english(res.error.message) ??
							`An unknown error occurred while running the ${plugin.key} plugin runtime hook`,
						{
							silent,
						},
					);
				}
				if (res.data?.artifacts) {
					pluginArtifacts.push(...res.data.artifacts);
				}
			}),
		);

		return {
			error: undefined,
			data: pluginArtifacts,
		};
	} catch (error) {
		return {
			error: {
				message: copy("server:core.plugins.build.failed", {
					defaultMessage:
						error instanceof Error
							? error.message
							: "An unknown error occurred while preparing plugin runtime artifacts",
				}),
				status: 500,
			},
			data: undefined,
		};
	}
};

export default handlePluginRuntimeHooks;

import type { Config } from "../../../types/config.js";
import type { RuntimeBuildArtifact } from "../../../libs/runtime-adapter/types.js";
import cliLogger from "../../cli/logger.js";
import type { ServiceResponse } from "../../../types.js";

/**
 * Responsible for running the plugin build hooks and collecting artifacts
 */
const handlePluginBuildHooks = async (props: {
	config: Config;
	silent?: boolean;
	configPath: string;
	outputPath: string;
	outputRelativeConfigPath: string;
}): ServiceResponse<RuntimeBuildArtifact[]> => {
	try {
		const pluginArtifacts: Array<RuntimeBuildArtifact> = [];
		const silent = props.silent ?? false;

		await Promise.all(
			props.config.plugins.map(async (plugin) => {
				if (!plugin.hooks?.build) {
					return;
				}
				const res = await plugin.hooks.build({
					paths: {
						configPath: props.configPath,
						outputPath: props.outputPath,
						outputRelativeConfigPath: props.outputRelativeConfigPath,
					},
				});
				if (res.error) {
					cliLogger.error(
						res.error.message ??
							`An unknown error occurred while building the ${plugin.key} plugin`,
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
				message:
					error instanceof Error
						? error.message
						: "An unknown error occurred while building the plugins",
				status: 500,
			},
			data: undefined,
		};
	}
};

export default handlePluginBuildHooks;

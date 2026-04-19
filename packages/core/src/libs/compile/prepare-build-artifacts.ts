import type { Config } from "../../types/config.js";
import processBuildArtifacts from "../cli/services/process-build-artifacts.js";
import handlePluginBuildHooks from "../plugins/hooks/handle-build.js";
import type {
	LucidConfigDefinition,
	RuntimeBuildArtifacts,
} from "../runtime-adapter/types.js";

const prepareBuildArtifacts = async (props: {
	config: Config;
	definition: LucidConfigDefinition;
	silent?: boolean;
	configPath: string;
	outputPath: string;
	outputRelativeConfigPath: string;
	customArtifactTypes?: string[];
}): Promise<RuntimeBuildArtifacts> => {
	const pluginBuildArtifactsRes = await handlePluginBuildHooks({
		config: props.config,
		definition: props.definition,
		silent: props.silent,
		configPath: props.configPath,
		outputPath: props.outputPath,
		outputRelativeConfigPath: props.outputRelativeConfigPath,
	});

	if (pluginBuildArtifactsRes.error || !pluginBuildArtifactsRes.data) {
		throw new Error(
			pluginBuildArtifactsRes.error?.message ??
				"Lucid build failed while preparing plugin artifacts.",
		);
	}

	return processBuildArtifacts({
		artifacts: pluginBuildArtifactsRes.data,
		outDir: props.outputPath,
		silent: props.silent ?? false,
		customArtifactTypes: props.customArtifactTypes,
	});
};

export default prepareBuildArtifacts;

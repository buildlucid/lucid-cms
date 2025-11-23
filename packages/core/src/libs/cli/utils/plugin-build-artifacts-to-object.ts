import type {
	PluginBuildArtifactResult,
	PluginBuildArtifactResultCompile,
} from "../../plugins/hooks/handle-build.js";
import type { LucidPluginBuildArtifactCompile } from "../../plugins/types.js";

/**
 * Converts the plugin build artifacts response to an object of compile artifacts.
 */
const pluginBuildCompileArtifactsToObject = (
	artifacts: PluginBuildArtifactResult,
): Record<string, string> => {
	const result: Record<string, string> = {};

	const compileArtifacts = artifacts.filter(
		(a): a is PluginBuildArtifactResultCompile => a.type === "compile",
	);
	for (const artifact of compileArtifacts) {
		if (artifact.type === "compile") {
			result[artifact.output] = artifact.path;
		}
	}
	return result;
};

export default pluginBuildCompileArtifactsToObject;

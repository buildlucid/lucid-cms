import type { PluginBuildArtifactResult } from "../../plugins/hooks/handle-build.js";

/**
 * Converts the plugin build artifacts response to an object of compile artifacts.
 */
const pluginBuildCompileArtifactsToObject = (
	artifacts: PluginBuildArtifactResult,
): Record<string, string> => {
	const result: Record<string, string> = {};
	for (const artifact of artifacts) {
		if (artifact.type === "compile") {
			result[artifact.output] = artifact.path;
		}
	}
	return result;
};

export default pluginBuildCompileArtifactsToObject;

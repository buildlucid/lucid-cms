import type {
	Config,
	LucidPluginBuildHookResult,
} from "../../../types/config.js";
import cliLogger from "../logger.js";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Responsible for running the plugin build hooks and creating artifacts
 */
type PluginArtifact = NonNullable<
	LucidPluginBuildHookResult["artifacts"]
>[number];

const handlePluginBuildHooks = async (props: {
	config: Config;
	silent?: boolean;
}) => {
	const pluginArtifacts: PluginArtifact[] = [];
	const outDir = props.config.compilerOptions.paths.outDir;
	const silent = props.silent ?? false;

	await Promise.all(
		props.config.plugins.map(async (plugin) => {
			if (!plugin.hooks?.build) {
				return;
			}
			const res = await plugin.hooks.build();
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

	if (!pluginArtifacts.length) return;

	await Promise.all(
		pluginArtifacts.map(async (artifact) => {
			const relativePath = artifact.path.replace(/^[/\\]+/, "");
			const artifactPath = path.join(outDir, relativePath);
			await fs.mkdir(path.dirname(artifactPath), { recursive: true });
			await fs.writeFile(artifactPath, artifact.content);
			cliLogger.info(
				"Plugin artifact built:",
				cliLogger.color.green(`./${relativePath}`),
				{
					silent,
				},
			);
		}),
	);
};

export default handlePluginBuildHooks;

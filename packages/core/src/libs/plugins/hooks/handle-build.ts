import type { Config } from "../../../types/config.js";
import type {
	LucidPluginBuildArtifactCompile,
	LucidPluginBuildArtifactFile,
} from "../../../libs/plugins/types.js";
import cliLogger from "../../cli/logger.js";
import fs from "node:fs/promises";
import path from "node:path";
import type { ServiceResponse } from "../../../types.js";

export type PluginBuildArtifactResult = Array<
	| {
			type: "file";
			path: string;
	  }
	| {
			type: "compile";
			path: string;
			output: string;
	  }
>;

/**
 * Responsible for running the plugin build hooks and creating artifacts
 */
const handlePluginBuildHooks = async (props: {
	config: Config;
	silent?: boolean;
	configPath: string;
	outputPath: string;
	outputRelativeConfigPath: string;
}): ServiceResponse<PluginBuildArtifactResult> => {
	try {
		const pluginArtifacts: Array<
			LucidPluginBuildArtifactFile | LucidPluginBuildArtifactCompile
		> = [];
		const outDir = props.config.compilerOptions.paths.outDir;
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

		if (!pluginArtifacts.length) {
			return {
				error: undefined,
				data: [],
			};
		}

		const results = (await Promise.all(
			pluginArtifacts.map(async (artifact) => {
				let artifactPathData: { path: string; content: string };

				if (artifact.type === "compile") {
					artifactPathData = artifact.input;
				} else {
					artifactPathData = {
						path: artifact.path,
						content: artifact.content,
					};
				}

				const relativePath = artifactPathData.path.replace(/^[/\\]+/, "");
				const artifactPath = path.join(outDir, relativePath);
				await fs.mkdir(path.dirname(artifactPath), { recursive: true });
				await fs.writeFile(artifactPath, artifactPathData.content);
				cliLogger.info(
					"Plugin artifact built:",
					cliLogger.color.green(`./${relativePath}`),
					{
						silent,
					},
				);

				if (artifact.type === "compile") {
					return {
						type: "compile",
						path: artifactPath,
						output: artifact.output.path,
					};
				}
				return {
					type: "file",
					path: artifactPath,
				};
			}),
		)) satisfies PluginBuildArtifactResult;

		return {
			error: undefined,
			data: results,
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

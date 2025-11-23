import type { Config } from "../../../types/config.js";
import type {
	LucidPluginBuildArtifactCompile,
	LucidPluginBuildArtifactCustom,
	LucidPluginBuildArtifactFile,
} from "../../../libs/plugins/types.js";
import cliLogger from "../../cli/logger.js";
import fs from "node:fs/promises";
import path from "node:path";
import type { ServiceResponse } from "../../../types.js";

export const CORE_ARTIFACT_TYPES = ["file", "compile"];

export type PluginBuildArtifactResultFile = {
	type: "file";
	path: string;
};
export type PluginBuildArtifactResultCompile = {
	type: "compile";
	path: string;
	output: string;
};
export type PluginBuildArtifactResultItem =
	| PluginBuildArtifactResultFile
	| PluginBuildArtifactResultCompile
	| LucidPluginBuildArtifactCustom;

export type PluginBuildArtifactResult = Array<PluginBuildArtifactResultItem>;

/**
 * Responsible for running the plugin build hooks and creating artifacts
 * @todo imrpove the response type and structure of this. Anything that isnt a core artifact should be returned as is
 * @todo improve typeing of artifact results, the types should also be from the runtime adapter instead
 */
const handlePluginBuildHooks = async (props: {
	config: Config;
	silent?: boolean;
	configPath: string;
	outputPath: string;
	outputRelativeConfigPath: string;
	customArtifactTypes?: string[];
}): ServiceResponse<PluginBuildArtifactResult> => {
	try {
		const pluginArtifacts: Array<
			| LucidPluginBuildArtifactFile
			| LucidPluginBuildArtifactCompile
			| LucidPluginBuildArtifactCustom
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
				if (props.customArtifactTypes?.includes(artifact.type)) {
					return artifact as LucidPluginBuildArtifactCustom;
				}

				if (!CORE_ARTIFACT_TYPES.includes(artifact.type)) {
					return undefined;
				}

				let artifactPathData: { path: string; content: string };

				if (artifact.type === "compile") {
					artifactPathData = (artifact as LucidPluginBuildArtifactCompile)
						.input;
				} else if (artifact.type === "file") {
					artifactPathData = {
						path: (artifact as LucidPluginBuildArtifactFile).path,
						content: (artifact as LucidPluginBuildArtifactFile).content,
					};
				} else {
					return undefined;
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
						output: (artifact as LucidPluginBuildArtifactCompile).output.path,
					};
				}
				return {
					type: "file",
					path: artifactPath,
				};
			}),
		)) satisfies (PluginBuildArtifactResultItem | undefined)[];

		return {
			error: undefined,
			data: results.filter(
				(r): r is PluginBuildArtifactResultItem => r !== undefined,
			),
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

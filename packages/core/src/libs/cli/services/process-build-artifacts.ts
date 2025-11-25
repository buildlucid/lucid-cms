import type {
	RuntimeBuildArtifact,
	RuntimeBuildArtifactCompile,
	RuntimeBuildArtifactCustom,
	RuntimeBuildArtifactFile,
	RuntimeBuildArtifacts,
} from "../../runtime-adapter/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import cliLogger from "../logger.js";

export const CORE_ARTIFACT_TYPES = ["file", "compile"];

/**
 * Responsible for processing the artifacts collected from the plugins.
 * Writes file and compile artifacts to the output directory.
 * Returns the artifacts formatted for the runtime adapter.
 */
const processBuildArtifacts = async (props: {
	artifacts: RuntimeBuildArtifact[];
	outDir: string;
	silent: boolean;
	customArtifactTypes?: string[];
}): Promise<RuntimeBuildArtifacts> => {
	const result: RuntimeBuildArtifacts = {
		compile: {},
		custom: [],
	};

	await Promise.all(
		props.artifacts.map(async (artifact) => {
			if (props.customArtifactTypes?.includes(artifact.type)) {
				result.custom.push(artifact as RuntimeBuildArtifactCustom);
				return;
			}

			if (!CORE_ARTIFACT_TYPES.includes(artifact.type)) {
				return;
			}

			let artifactPathData: { path: string; content: string };

			if (artifact.type === "compile") {
				const compileArtifact = artifact as RuntimeBuildArtifactCompile;
				const dirname = path.dirname(compileArtifact.path);
				const filename = path.basename(compileArtifact.path);
				artifactPathData = {
					path: path.join(dirname, `temp-${filename}`),
					content: compileArtifact.content,
				};
			} else if (artifact.type === "file") {
				artifactPathData = {
					path: (artifact as RuntimeBuildArtifactFile).path,
					content: (artifact as RuntimeBuildArtifactFile).content,
				};
			} else {
				return;
			}

			const relativePath = artifactPathData.path.replace(/^[/\\]+/, "");
			const artifactPath = path.join(props.outDir, relativePath);
			await fs.mkdir(path.dirname(artifactPath), { recursive: true });
			await fs.writeFile(artifactPath, artifactPathData.content);
			cliLogger.info(
				"Plugin artifact built:",
				cliLogger.color.green(`./${relativePath}`),
				{
					silent: props.silent,
				},
			);

			if (artifact.type === "compile") {
				const compileArtifact = artifact as RuntimeBuildArtifactCompile;
				const ext = path.extname(compileArtifact.path);
				const nameWithoutExt = path.basename(compileArtifact.path, ext);
				const dir = path.dirname(compileArtifact.path);
				const key = path.join(dir, nameWithoutExt);
				result.compile[key] = artifactPath;
			}
		}),
	);

	return result;
};

export default processBuildArtifacts;

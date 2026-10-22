import fs from "node:fs/promises";
import path from "node:path";
import type {
	RuntimeBuildArtifact,
	RuntimeBuildArtifactCustom,
	RuntimeBuildArtifacts,
} from "../../runtime/types.js";
import cliLogger from "../logger.js";

/** Writes plugin file artifacts to the output directory and returns custom artifacts supported by the runtime adapter. */
const processBuildArtifacts = async (props: {
	artifacts: RuntimeBuildArtifact[];
	outDir: string;
	silent: boolean;
	customArtifactTypes?: string[];
}): Promise<RuntimeBuildArtifacts> => {
	const result: RuntimeBuildArtifacts = {
		custom: [],
	};

	await Promise.all(
		props.artifacts.map(async (artifact) => {
			if (props.customArtifactTypes?.includes(artifact.type)) {
				result.custom.push(artifact as RuntimeBuildArtifactCustom);
				return;
			}

			if (artifact.type !== "file" || !("path" in artifact)) {
				return;
			}

			const relativePath = artifact.path.replace(/^[/\\]+/, "");
			const artifactPath = path.join(props.outDir, relativePath);
			await fs.mkdir(path.dirname(artifactPath), { recursive: true });
			await fs.writeFile(artifactPath, artifact.content);
			cliLogger.info(
				"Plugin artifact built:",
				cliLogger.color.green(`./${relativePath}`),
				{
					silent: props.silent,
				},
			);
		}),
	);

	return result;
};

export default processBuildArtifacts;

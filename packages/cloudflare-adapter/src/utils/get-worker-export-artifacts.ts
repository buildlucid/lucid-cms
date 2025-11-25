import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";

// TODO: improve structure of these worker export artifacts. specifically around imports. currently there is no depupeing.
// TODO: artifacts here need to be filtered for the worker-export one specifically.
const getWorkerExportArtifacts = (
	artifacts: RuntimeBuildArtifactCustom[],
): { imports: string; exports: string } => {
	const imports: string[] = [];
	const exports: string[] = [];

	for (const artifact of artifacts) {
		if ("import" in artifact.custom && artifact.custom.import) {
			imports.push(artifact.custom.import);
		}
		if ("export" in artifact.custom && artifact.custom.export) {
			exports.push(artifact.custom.export);
		}
	}

	return {
		imports: imports.join("\n"),
		exports: exports.join(',"\n"'),
	};
};

export default getWorkerExportArtifacts;

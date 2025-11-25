import path from "node:path";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerImport,
	CloudflareWorkerEntryArtifact,
} from "../types.js";
import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";

const prepareAdditionalWorkerEntries = (
	customArtifacts: RuntimeBuildArtifactCustom[],
): Array<{
	key: string;
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
}> => {
	const entries: Array<{
		key: string;
		imports: CloudflareWorkerImport[];
		exports: CloudflareWorkerExport[];
	}> = [];

	for (const artifact of customArtifacts) {
		if (artifact.type === "worker-entry") {
			const custom = artifact.custom as CloudflareWorkerEntryArtifact;
			const filename = path.basename(custom.filename);
			entries.push({
				key: filename,
				imports: custom.imports,
				exports: custom.exports,
			});
		}
	}

	return entries;
};

export default prepareAdditionalWorkerEntries;

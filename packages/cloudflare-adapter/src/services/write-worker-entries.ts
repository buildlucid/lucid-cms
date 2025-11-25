import { writeFile } from "node:fs/promises";
import buildTempWorkerEntry from "./build-temp-worker-entry.js";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerImport,
} from "../types.js";

const writeWorkerEntries = async (
	entries: Array<{
		filepath: string;
		imports: CloudflareWorkerImport[];
		exports: CloudflareWorkerExport[];
	}>,
): Promise<string[]> => {
	const tempFiles: string[] = [];

	for (const entry of entries) {
		const content = buildTempWorkerEntry(entry.imports, entry.exports);
		await writeFile(entry.filepath, content);
		tempFiles.push(entry.filepath);
	}

	return tempFiles;
};

export default writeWorkerEntries;

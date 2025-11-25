import { writeFile } from "node:fs/promises";
import buildTempWorkerEntry from "./build-temp-worker-entry.js";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerImport,
} from "../types.js";

/**
 * Writes temp worker entry files to the filesystem
 */
const writeWorkerEntries = async (
	entries: Array<{
		filepath: string;
		imports: CloudflareWorkerImport[];
		exports: CloudflareWorkerExport[];
	}>,
): Promise<string[]> => {
	const tempFiles = await Promise.all(
		entries.map(async (entry) => {
			const content = buildTempWorkerEntry(entry.imports, entry.exports);
			await writeFile(entry.filepath, content);
			return entry.filepath;
		}),
	);

	return tempFiles;
};

export default writeWorkerEntries;

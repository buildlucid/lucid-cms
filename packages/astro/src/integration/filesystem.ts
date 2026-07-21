import fs from "node:fs/promises";
import path from "node:path";

/** Ensures a directory exists. */
export const ensureDirectory = (directory: string) =>
	fs.mkdir(directory, { recursive: true });

/** Checks whether a file-system path exists. */
export const pathExists = async (filePath: string) => {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
};

/** Recursively collects the files beneath a directory. */
export const collectFiles = async (directory: string): Promise<string[]> => {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(directory, entry.name);
			return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
		}),
	);

	return files.flat();
};

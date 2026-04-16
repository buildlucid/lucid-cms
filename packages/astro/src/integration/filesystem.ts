import fs from "node:fs/promises";
import path from "node:path";

/**
 * The integration writes into Astro's generated workspace, so directory
 * creation needs to be predictable and shared across helpers.
 */
export const ensureDirectory = async (dirPath: string) => {
	await fs.mkdir(dirPath, { recursive: true });
};

/**
 * Asset preparation is intentionally tolerant of optional trees, so a boolean
 * existence check keeps that flow readable without scattered try/catch blocks.
 */
export const pathExists = async (targetPath: string) => {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
};

/**
 * Vite emits files one at a time, while Lucid prepares nested directories. This
 * flattening step keeps the bundler-facing code small and focused.
 */
export const collectFiles = async (rootDir: string): Promise<string[]> => {
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(rootDir, entry.name);
			if (entry.isDirectory()) {
				return collectFiles(fullPath);
			}
			return [fullPath];
		}),
	);

	return files.flat();
};

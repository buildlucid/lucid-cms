import fs from "node:fs/promises";
import path from "node:path";
import { LucidError } from "../errors/index.js";
import { pathExists } from "./resolve-source-path.js";

export const moduleFileExtensions = [".ts", ".mts", ".js", ".mjs"];

const isModuleFile = (fileName: string) => {
	if (fileName.endsWith(".d.ts") || fileName.endsWith(".d.mts")) return false;
	return moduleFileExtensions.includes(path.extname(fileName));
};

/**
 * Collects loadable module files from one resolved file or flat directory.
 * Migration and seed discovery share this path so package, workspace and
 * project-directory sources behave consistently.
 */
const collectModuleFiles = async (
	sourcePath: string,
	options: {
		label: string;
		optional?: boolean;
	},
): Promise<string[]> => {
	if (!(await pathExists(sourcePath))) {
		if (options.optional) return [];
		throw new LucidError({
			message: `${options.label} "${sourcePath}" does not exist.`,
		});
	}

	const stats = await fs.stat(sourcePath);
	if (stats.isFile()) {
		if (!isModuleFile(path.basename(sourcePath))) {
			throw new LucidError({
				message: `${options.label} "${sourcePath}" must be a ${moduleFileExtensions.join(", ")} file.`,
			});
		}
		return [sourcePath];
	}
	if (!stats.isDirectory()) {
		throw new LucidError({
			message: `${options.label} "${sourcePath}" must be a file or directory.`,
		});
	}

	const entries = await fs.readdir(sourcePath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && isModuleFile(entry.name))
		.map((entry) => path.join(sourcePath, entry.name))
		.sort();
};

export default collectModuleFiles;

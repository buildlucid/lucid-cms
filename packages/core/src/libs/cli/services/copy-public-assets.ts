import fs from "node:fs/promises";
import path from "node:path";
import { getDirName } from "../../../utils/helpers/index.js";
import constants from "../../../constants/constants.js";
import type { Config, ServiceResponse } from "../../../types.js";
import cliLogger from "../logger.js";

const currentDir = getDirName(import.meta.url);

/**
 * Checks if a path exists
 */
const pathExists = async (targetPath: string) => {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
};

/**
 * Checks if a path is a directory
 */
const isDirectory = async (targetPath: string) => {
	const stats = await fs.stat(targetPath);
	return stats.isDirectory();
};

/**
 * Ensures a directory exists
 */
const ensureDir = async (dirPath: string) => {
	await fs.mkdir(dirPath, { recursive: true });
};

/**
 * Copies a file from srcFile to destFile
 * - Creates the directory if it doesn't exist
 */
const copyFileTo = async (
	srcFile: string,
	destFile: string,
	silent: boolean,
) => {
	await ensureDir(path.dirname(destFile));
	await fs.copyFile(srcFile, destFile);

	const relativeOutPath = path.relative(process.cwd(), destFile);
	const displayPath =
		relativeOutPath.startsWith(".") || relativeOutPath === ""
			? relativeOutPath || "."
			: `./${relativeOutPath}`;

	cliLogger.info("Copied public asset:", cliLogger.color.green(displayPath), {
		silent,
	});
};

/**
 * Copies the contents of srcDir into destDir
 */
const copyDirectoryContentsInto = async (
	srcDir: string,
	destDir: string,
	silent: boolean,
) => {
	await ensureDir(destDir);
	const entries = await fs.readdir(srcDir, { withFileTypes: true });
	await Promise.all(
		entries.map(async (entry) => {
			const srcPath = path.join(srcDir, entry.name);
			const destPath = path.join(destDir, entry.name);
			if (entry.isDirectory()) {
				await copyDirectoryContentsInto(srcPath, destPath, silent);
			} else if (entry.isFile()) {
				await copyFileTo(srcPath, destPath, silent);
			}
		}),
	);
};

/**
 * Copies the public assets from various sources into the output directory
 */
const copyPublicAssets = async (props: {
	config: Config;
	silent?: boolean;
}): ServiceResponse<undefined> => {
	try {
		const silent = props.silent ?? false;
		const assetsPath = path.join(currentDir, "../../../../public");

		const outDir = path.join(
			props.config.compilerOptions.paths.outDir,
			constants.directories.public,
		);

		await ensureDir(outDir);

		//* core public assets (lowest prio)
		if (await pathExists(assetsPath)) {
			await copyDirectoryContentsInto(assetsPath, outDir, silent);
		}

		//* config defined additional public assets (medium prio)
		const additionalPublic =
			props.config.compilerOptions.paths.copyPublic ?? [];
		await Promise.all(
			additionalPublic.map(async (entry) => {
				const isString = typeof entry === "string";
				const source = isString ? entry : entry.input;
				const output = isString ? undefined : entry.output;

				const absSource = path.isAbsolute(source)
					? source
					: path.join(process.cwd(), source);
				if (!(await pathExists(absSource))) return;

				if (await isDirectory(absSource)) {
					if (output) {
						const destDir = path.join(outDir, output);
						await copyDirectoryContentsInto(absSource, destDir, silent);
					} else {
						const destPath = path.join(outDir, path.basename(absSource));
						await copyDirectoryContentsInto(absSource, destPath, silent);
					}
				} else {
					if (output) {
						const destFile = path.join(outDir, output);
						await copyFileTo(absSource, destFile, silent);
					} else {
						const destFile = path.join(outDir, path.basename(absSource));
						await copyFileTo(absSource, destFile, silent);
					}
				}
			}),
		);

		//* cwd public assets (highest prio)
		const cwdPublic = path.join(process.cwd(), constants.directories.public);
		if ((await pathExists(cwdPublic)) && (await isDirectory(cwdPublic))) {
			await copyDirectoryContentsInto(cwdPublic, outDir, silent);
		}

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				message:
					error instanceof Error
						? error.message
						: "An error occurred while copying public assets",
			},
			data: undefined,
		};
	}
};

export default copyPublicAssets;

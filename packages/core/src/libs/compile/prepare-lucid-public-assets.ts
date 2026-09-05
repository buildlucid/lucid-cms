import fs from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";
import type { ServiceResponse } from "../../exports/types.js";
import { getDirName } from "../../utils/helpers/index.js";
import cliLogger from "../cli/logger.js";
import { copy } from "../i18n/index.js";
import type { ResourceFile } from "../resources/types.js";

const currentDir = getDirName(import.meta.url);

const pathExists = async (targetPath: string) => {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
};

const ensureDir = async (dirPath: string) => {
	await fs.mkdir(dirPath, { recursive: true });
};

const copyFileTo = async (
	srcFile: string,
	destFile: string,
	silent: boolean,
	verbose: boolean,
	projectRoot: string,
) => {
	await ensureDir(path.dirname(destFile));
	await fs.copyFile(srcFile, destFile);

	const relativeOutPath = path.relative(projectRoot, destFile);
	const displayPath =
		relativeOutPath.startsWith(".") || relativeOutPath === ""
			? relativeOutPath || "."
			: `./${relativeOutPath}`;

	if (verbose) {
		cliLogger.info("Copied public asset:", cliLogger.color.green(displayPath), {
			silent,
		});
	}
};

const copyDirectoryContentsInto = async (
	srcDir: string,
	destDir: string,
	silent: boolean,
	verbose: boolean,
	projectRoot: string,
) => {
	await ensureDir(destDir);
	const entries = await fs.readdir(srcDir, { withFileTypes: true });

	await Promise.all(
		entries.map(async (entry) => {
			const srcPath = path.join(srcDir, entry.name);
			const destPath = path.join(destDir, entry.name);

			if (entry.isDirectory()) {
				await copyDirectoryContentsInto(
					srcPath,
					destPath,
					silent,
					verbose,
					projectRoot,
				);
			} else if (entry.isFile()) {
				await copyFileTo(srcPath, destPath, silent, verbose, projectRoot);
			}
		}),
	);
};

const prepareLucidPublicAssets = async (props: {
	files: ResourceFile[];
	outDir: string;
	projectRoot?: string;
	silent?: boolean;
	verbose?: boolean;
}): ServiceResponse<undefined> => {
	try {
		const projectRoot = props.projectRoot ?? process.cwd();
		const silent = props.silent ?? false;
		const verbose = props.verbose ?? false;
		const corePublicPath = path.join(
			currentDir,
			"../../../",
			constants.directories.public,
		);

		await ensureDir(props.outDir);

		if (await pathExists(corePublicPath)) {
			await copyDirectoryContentsInto(
				corePublicPath,
				props.outDir,
				silent,
				verbose,
				projectRoot,
			);
		}

		for (const file of props.files) {
			await copyFileTo(
				file.path,
				path.join(props.outDir, file.name),
				silent,
				verbose,
				projectRoot,
			);
		}

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				message: copy("server:core.build.public.assets.copy.failed", {
					defaultMessage:
						error instanceof Error
							? error.message
							: "An error occurred while copying public assets",
				}),
			},
			data: undefined,
		};
	}
};

export default prepareLucidPublicAssets;

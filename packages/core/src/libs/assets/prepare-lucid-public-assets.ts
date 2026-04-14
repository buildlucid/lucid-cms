import fs from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";
import type { Config, ServiceResponse } from "../../types.js";
import { getDirName } from "../../utils/helpers/index.js";
import cliLogger from "../cli/logger.js";

const currentDir = getDirName(import.meta.url);

const pathExists = async (targetPath: string) => {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
};

const isDirectory = async (targetPath: string) => {
	const stats = await fs.stat(targetPath);
	return stats.isDirectory();
};

const ensureDir = async (dirPath: string) => {
	await fs.mkdir(dirPath, { recursive: true });
};

const copyFileTo = async (
	srcFile: string,
	destFile: string,
	silent: boolean,
	projectRoot: string,
) => {
	await ensureDir(path.dirname(destFile));
	await fs.copyFile(srcFile, destFile);

	const relativeOutPath = path.relative(projectRoot, destFile);
	const displayPath =
		relativeOutPath.startsWith(".") || relativeOutPath === ""
			? relativeOutPath || "."
			: `./${relativeOutPath}`;

	cliLogger.info("Copied public asset:", cliLogger.color.green(displayPath), {
		silent,
	});
};

const copyDirectoryContentsInto = async (
	srcDir: string,
	destDir: string,
	silent: boolean,
	projectRoot: string,
) => {
	await ensureDir(destDir);
	const entries = await fs.readdir(srcDir, { withFileTypes: true });

	await Promise.all(
		entries.map(async (entry) => {
			const srcPath = path.join(srcDir, entry.name);
			const destPath = path.join(destDir, entry.name);

			if (entry.isDirectory()) {
				await copyDirectoryContentsInto(srcPath, destPath, silent, projectRoot);
			} else if (entry.isFile()) {
				await copyFileTo(srcPath, destPath, silent, projectRoot);
			}
		}),
	);
};

const prepareLucidPublicAssets = async (props: {
	config: Config;
	outDir: string;
	projectRoot?: string;
	includeProjectPublic?: boolean;
	silent?: boolean;
}): ServiceResponse<undefined> => {
	try {
		const projectRoot = props.projectRoot ?? process.cwd();
		const silent = props.silent ?? false;
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
				projectRoot,
			);
		}

		const additionalPublic = props.config.build.paths.copyPublic ?? [];
		await Promise.all(
			additionalPublic.map(async (entry) => {
				const isString = typeof entry === "string";
				const source = isString ? entry : entry.input;
				const output = isString ? undefined : entry.output;

				const absSource = path.isAbsolute(source)
					? source
					: path.join(projectRoot, source);
				if (!(await pathExists(absSource))) return;

				if (await isDirectory(absSource)) {
					const destDir = output
						? path.join(props.outDir, output)
						: path.join(props.outDir, path.basename(absSource));
					await copyDirectoryContentsInto(
						absSource,
						destDir,
						silent,
						projectRoot,
					);
				} else {
					const destFile = output
						? path.join(props.outDir, output)
						: path.join(props.outDir, path.basename(absSource));
					await copyFileTo(absSource, destFile, silent, projectRoot);
				}
			}),
		);

		if (props.includeProjectPublic) {
			const cwdPublic = path.join(projectRoot, constants.directories.public);
			if ((await pathExists(cwdPublic)) && (await isDirectory(cwdPublic))) {
				await copyDirectoryContentsInto(
					cwdPublic,
					props.outDir,
					silent,
					projectRoot,
				);
			}
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

export default prepareLucidPublicAssets;

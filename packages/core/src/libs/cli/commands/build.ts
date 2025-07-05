import { mkdir, rm, stat } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path, { join } from "node:path";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";
import createBuildLogger from "../logger/build-logger.js";
import constants from "../../../constants/constants.js";
import copyPublicAssets from "../utils/copy-public-assets.js";

/**
 * The CLI build command. Responsible for calling the adapters build handler.
 */
const buildCommand = async (options?: {
	cacheSpa?: boolean;
	silent?: boolean;
}) => {
	await installOptionalDeps();
	const overallStartTime = process.hrtime();
	const configPath = getConfigPath(process.cwd());
	const configRes = await loadConfigFile({ path: configPath });

	const logger = createBuildLogger(options?.silent);

	logger.buildStart();

	try {
		if (options?.cacheSpa) {
			await partialBuildDirClear(configRes.config.compilerOptions?.outDir);
		} else {
			await rm(configRes.config.compilerOptions?.outDir, {
				recursive: true,
				force: true,
			});
			await mkdir(configRes.config.compilerOptions?.outDir);
		}

		if (!configRes.adapter?.cli?.build) {
			logger.info("No build handler found in adapter");
			return;
		}

		const [viteBuildRes] = await Promise.all([
			vite.buildApp(configRes.config, undefined, options?.silent),
			configRes.adapter.cli.build(
				configRes.config,
				{
					configPath,
					outputPath: configRes.config.compilerOptions?.outDir,
				},
				logger,
			),
		]);
		if (viteBuildRes.error) {
			logger.buildFailed(viteBuildRes.error);
			process.exit(1);
		}

		await Promise.all([
			prerenderMjmlTemplates(configRes.config),
			copyPublicAssets(configRes.config),
		]);

		logger.buildComplete(overallStartTime);

		process.exit(0);
	} catch (error) {
		logger.buildFailed(error);
		process.exit(1);
	}
};

/**
 * Partially clear the build directory while preserving the SPA build output
 */
const partialBuildDirClear = async (outDir: string | undefined) => {
	if (!outDir) return;

	const items = await readdir(outDir, { recursive: true });

	const preservePaths = [
		path.join(constants.directories.public, constants.vite.dist),
		path.join(constants.directories.temp, constants.vite.buildMetadata),
	];

	for (const item of items) {
		const itemPath = join(outDir, item);

		try {
			const stats = await stat(itemPath);
			if (!stats.isFile()) continue;
		} catch {
			continue;
		}

		const shouldPreserve = preservePaths.some(
			(preservePath) =>
				item.includes(preservePath) ||
				item === preservePath ||
				itemPath.includes(preservePath) ||
				itemPath === join(outDir, preservePath),
		);

		if (!shouldPreserve) {
			await rm(itemPath, { force: true });
		}
	}
};

export default buildCommand;

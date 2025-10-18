import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path, { join } from "node:path";
import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prerenderMjmlTemplates from "../../email-adapter/templates/prerender-mjml-templates.js";
import logger from "../../logger/index.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import cliLogger from "../logger.js";
import copyPublicAssets from "../utils/copy-public-assets.js";

/**
 * The CLI build command. Responsible for calling the adapters build handler.
 */
const buildCommand = async (options?: {
	cacheSpa?: boolean;
	silent?: boolean;
}) => {
	logger.setBuffering(true);
	const startTime = cliLogger.startTimer();
	const configPath = getConfigPath(process.cwd());
	const configRes = await loadConfigFile({ path: configPath });

	try {
		if (options?.cacheSpa) {
			await partialBuildDirClear(configRes.config.compilerOptions.paths.outDir);
		} else {
			await rm(configRes.config.compilerOptions.paths.outDir, {
				recursive: true,
				force: true,
			});
			await mkdir(configRes.config.compilerOptions.paths.outDir);
		}

		if (!configRes.adapter?.cli?.build) {
			cliLogger.error("No build handler found in adapter");
			return;
		}

		generateTypes({
			envSchema: configRes.envSchema,
			configPath: configPath,
		});

		await Promise.all([prerenderMjmlTemplates(configRes.config)]);

		const [viteBuildRes, runtimeBuildRes] = await Promise.all([
			vite.buildApp(configRes.config),
			configRes.adapter.cli.build(
				configRes.config,
				{
					configPath,
					outputPath: configRes.config.compilerOptions.paths.outDir,
				},
				cliLogger,
			),
		]);
		if (viteBuildRes.error) {
			cliLogger.error(
				viteBuildRes.error.message ??
					"There was an error while building the SPA or component plugins",
			);
			logger.setBuffering(false);
			process.exit(1);
		}
		cliLogger.info("SPA and component plugins built");

		await copyPublicAssets(configRes.config);
		cliLogger.info(
			"Public assets copied to output directory:",
			cliLogger.color.green(
				`./${configRes.config.compilerOptions.paths.outDir}`,
			),
		);

		for (const collection of configRes.config.collections) {
			if (!collection.key) continue;
			cliLogger.info(
				"Build includes collection:",
				cliLogger.color.yellow(collection.key),
			);
		}
		for (const plugin of configRes.config.plugins) {
			const res = await plugin(configRes.config);
			cliLogger.info("Build includes plugin:", cliLogger.color.yellow(res.key));
		}

		await runtimeBuildRes?.onComplete?.();
		const endTime = startTime();

		cliLogger.log(
			cliLogger.createBadge("READY"),
			"Build completed",
			cliLogger.color.green("successfully"),
			cliLogger.color.gray("in"),
			cliLogger.color.gray(cliLogger.formatMilliseconds(endTime)),
			{
				spaceAfter: true,
				spaceBefore: true,
			},
		);

		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		cliLogger.error(
			error instanceof Error ? error.message : "An unknown error occurred",
		);
		logger.setBuffering(false);
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
		path.join(constants.directories.public, constants.directories.admin),
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

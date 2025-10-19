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
import calculateOutDirSize from "../utils/calculate-outdir-size.js";
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
			configRes.adapter.cli.build({
				config: configRes.config,
				options: {
					configPath,
					outputPath: configRes.config.compilerOptions.paths.outDir,
				},
				logger: cliLogger,
			}),
		]);
		if (viteBuildRes.error) {
			cliLogger.error(
				viteBuildRes.error.message ??
					"There was an error while building the SPA or component plugins",
			);
			logger.setBuffering(false);
			process.exit(1);
		}
		const relativePath = path.relative(process.cwd(), configPath);
		cliLogger.info(
			"Loaded config from:",
			cliLogger.color.green(`./${relativePath}`),
		);

		const relativeBuildPath = path.relative(
			process.cwd(),
			configRes.config.compilerOptions.paths.outDir,
		);

		await copyPublicAssets(configRes.config);
		cliLogger.info(
			"Public assets copied to output directory:",
			cliLogger.color.green(
				`./${relativeBuildPath}/${constants.directories.public}`,
			),
		);
		cliLogger.info(
			"SPA and component plugins built:",
			cliLogger.color.green(
				`./${relativeBuildPath}/${constants.directories.public}/${constants.directories.admin}`,
			),
		);

		let fieldCount = 0;
		const collectionKeys = new Set<string>();
		const brickKeys = new Set<string>();
		for (const collection of configRes.config.collections) {
			if (!collection.key) continue;
			collectionKeys.add(collection.key);
			for (const brick of collection.brickInstances) {
				if (brickKeys.has(brick.key)) continue;
				brickKeys.add(brick.key);
				fieldCount += brick.flatFields.length;
			}
			fieldCount += collection.flatFields.length;
		}
		cliLogger.info(
			cliLogger.color.yellow(collectionKeys.size),
			`collection${collectionKeys.size === 1 ? "" : "s"} with`,
			cliLogger.color.yellow(brickKeys.size),
			`brick${brickKeys.size === 1 ? "" : "s"} and`,
			cliLogger.color.yellow(fieldCount),
			`field${fieldCount === 1 ? "" : "s"}`,
		);
		cliLogger.info(
			cliLogger.color.yellow(configRes.config.plugins.length),
			`plugin${configRes.config.plugins.length === 1 ? "" : "s"} loaded`,
		);

		await runtimeBuildRes?.onComplete?.();
		const endTime = startTime();

		const distSize = await calculateOutDirSize(
			configRes.config.compilerOptions.paths.outDir,
		);

		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			"Build completed",
			"successfully",
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			cliLogger.color.green(`(${cliLogger.formatBytes(distSize)})`),
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

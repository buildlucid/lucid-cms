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
import calculateOutDirSize from "../services/calculate-outdir-size.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import handlePluginBuildHooks from "../../plugins/hooks/handle-build.js";
import processBuildArtifacts from "../services/process-build-artifacts.js";
import checkAllPluginsCompatibility from "../../plugins/check-all-plugins-compatibility.js";

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
	const silent = options?.silent ?? false;
	const configRes = await loadConfigFile({ path: configPath, silent });

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
			cliLogger.error("No build handler found in adapter", {
				silent,
			});
			return;
		}

		//* the path to the config, relative from the CWD
		const relativeConfigPath = path.relative(process.cwd(), configPath);
		cliLogger.info(
			"Loaded config from:",
			cliLogger.color.green(`./${relativeConfigPath}`),
			{
				silent,
			},
		);

		//* the path to the config, relative from the output directory
		const outputRelativeConfigPath = path.relative(
			configRes.config.compilerOptions.paths.outDir,
			configPath,
		);
		const normalisedOutputRelativePath = outputRelativeConfigPath.replace(
			/\.ts$/,
			".js",
		);

		generateTypes({
			envSchema: configRes.envSchema,
			configPath: configPath,
		});

		const [mjmlTemplatesRes, publicAssetsRes, pluginBuildArtifactsRes] =
			await Promise.all([
				prerenderMjmlTemplates({
					config: configRes.config,
					silent,
				}),
				copyPublicAssets({
					config: configRes.config,
					silent,
				}),
				handlePluginBuildHooks({
					config: configRes.config,
					silent,
					configPath,
					outputPath: configRes.config.compilerOptions.paths.outDir,
					outputRelativeConfigPath: normalisedOutputRelativePath,
				}),
			]);
		if (mjmlTemplatesRes.error) {
			cliLogger.error(
				mjmlTemplatesRes.error.message ?? "Failed to pre-render MJML templates",
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}
		if (publicAssetsRes.error) {
			cliLogger.error(
				publicAssetsRes.error.message ?? "Failed to copy public assets",
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}
		if (pluginBuildArtifactsRes.error) {
			cliLogger.error(
				pluginBuildArtifactsRes.error.message ?? "Failed to build the plugins",
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}

		const processedArtifacts = await processBuildArtifacts({
			artifacts: pluginBuildArtifactsRes.data,
			outDir: configRes.config.compilerOptions.paths.outDir,
			silent,
			customArtifactTypes: configRes.adapter.config?.customBuildArtifacts,
		});

		const [viteBuildRes, runtimeBuildRes] = await Promise.all([
			vite.buildApp(configRes.config),
			configRes.adapter.cli.build({
				config: configRes.config,
				configPath,
				outputPath: configRes.config.compilerOptions.paths.outDir,
				outputRelativeConfigPath: normalisedOutputRelativePath,
				buildArtifacts: processedArtifacts,
				logger: {
					instance: cliLogger,
					silent,
				},
			}),
		]);
		if (viteBuildRes.error) {
			cliLogger.error(
				viteBuildRes.error.message ??
					"There was an error while building the SPA or component plugins",
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}

		await checkAllPluginsCompatibility({
			runtimeContext: runtimeBuildRes.runtimeContext,
			config: configRes.config,
		});

		const relativeBuildPath = path.relative(
			process.cwd(),
			configRes.config.compilerOptions.paths.outDir,
		);

		cliLogger.info(
			"SPA and component plugins built:",
			cliLogger.color.green(
				`./${relativeBuildPath}/${constants.directories.public}/${constants.directories.admin}`,
			),
			{
				silent,
			},
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
			{
				silent,
			},
		);
		cliLogger.info(
			cliLogger.color.yellow(configRes.config.plugins.length),
			`plugin${configRes.config.plugins.length === 1 ? "" : "s"} loaded`,
			{
				silent,
			},
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
				silent,
			},
		);

		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		if (error instanceof Error) {
			cliLogger.errorInstance(error);
		}
		cliLogger.error("Failed to build the application");
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

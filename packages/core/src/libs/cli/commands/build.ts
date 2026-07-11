import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path, { join } from "node:path";
import constants from "../../../constants/constants.js";
import loadBuildProject from "../../compile/load-build-project.js";
import prepareBuildArtifacts from "../../compile/prepare-build-artifacts.js";
import prepareEmailTemplates from "../../email/templates/prepare-email-templates.js";
import {
	createTranslator,
	writeTranslationArtifact,
} from "../../i18n/index.js";
import logger from "../../logger/index.js";
import checkAllPluginsCompatibility from "../../plugins/check-all-plugins-compatibility.js";
import vite from "../../vite/index.js";
import cliLogger from "../logger.js";
import calculateOutDirSize from "../services/calculate-outdir-size.js";
import copyPublicAssets from "../services/copy-public-assets.js";

/**
 * The CLI build command. Responsible for calling the adapters build handler.
 */
const buildCommand = async (options?: {
	cacheSpa?: boolean;
	silent?: boolean;
	remote?: boolean;
}) => {
	logger.setBuffering(true);
	const startTime = cliLogger.startTimer();
	const silent = options?.silent ?? false;

	try {
		const buildProject = await loadBuildProject({
			silent,
			loadEmailTemplates: false,
			prepareRuntime: true,
		});
		const { configPath, loaded: configRes } = buildProject;
		const translate = createTranslator({
			store: configRes.translationStore,
			locale: "en",
		});

		const adapterRuntime = configRes.adapter;
		const adapterCLI = adapterRuntime.cli;

		if (!adapterCLI) {
			cliLogger.error(
				`Lucid could not load CLI handlers from the "${configRes.adapter.key}" runtime adapter.`,
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}

		await checkAllPluginsCompatibility({
			runtimeContext: configRes.runtimeContext,
			config: configRes.config,
		});

		if (options?.cacheSpa) {
			await partialBuildDirClear(configRes.config.build.paths.outDir);
		} else {
			await rm(configRes.config.build.paths.outDir, {
				recursive: true,
				force: true,
			});
			await mkdir(configRes.config.build.paths.outDir);
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
			configRes.config.build.paths.outDir,
			configPath,
		);
		const normalisedOutputRelativePath = outputRelativeConfigPath.replace(
			/\.ts$/,
			".js",
		);

		await writeTranslationArtifact({
			translationStore: configRes.translationStore,
			outputPath: configRes.config.build.paths.outDir,
		});

		const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
			prepareEmailTemplates({
				config: configRes.config,
				silent,
				verbose: true,
			}),
			copyPublicAssets({
				config: configRes.config,
				silent,
				verbose: true,
			}),
		]);
		if (emailTemplatesRes.error) {
			cliLogger.error(
				translate.english(emailTemplatesRes.error.message) ??
					"Failed to prepare email templates",
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}
		if (publicAssetsRes.error) {
			cliLogger.error(
				translate.english(publicAssetsRes.error.message) ??
					"Failed to copy public assets",
				{
					silent,
				},
			);
			logger.setBuffering(false);
			process.exit(1);
		}
		const translationStore = configRes.translationStore;
		const processedArtifacts = await prepareBuildArtifacts({
			config: configRes.config,
			translationStore,
			definition: configRes.definition,
			silent,
			configPath,
			outputPath: configRes.config.build.paths.outDir,
			outputRelativeConfigPath: normalisedOutputRelativePath,
			customArtifactTypes: adapterRuntime.config?.customBuildArtifacts,
		});
		const [viteBuildRes, runtimeBuildRes] = await Promise.all([
			vite.buildApp(configRes.config),
			adapterCLI.build({
				config: configRes.config,
				translationStore,
				definition: configRes.definition,
				configPath,
				outputPath: configRes.config.build.paths.outDir,
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
				translate.english(viteBuildRes.error.message) ??
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
			configRes.config.build.paths.outDir,
		);

		cliLogger.info(
			"SPA and component plugins built:",
			cliLogger.color.green(
				`./${relativeBuildPath}/${constants.directories.public}/${constants.directories.base}`,
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
			configRes.config.build.paths.outDir,
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
		path.join(constants.directories.public, constants.directories.base),
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

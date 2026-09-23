import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import buildApp from "../../admin/build-app.js";
import loadBuildProject from "../../compile/load-build-project.js";
import prepareBuildArtifacts from "../../compile/prepare-build-artifacts.js";
import prepareEmailTemplates from "../../email/templates/prepare-email-templates.js";
import {
	createTranslator,
	writeTranslationArtifact,
} from "../../i18n/index.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import checkAllPluginsCompatibility from "../../plugins/check-all-plugins-compatibility.js";
import createCommandTelemetryReporter, {
	type CommandTelemetryReporter,
} from "../../telemetry/command-reporter.js";
import type { TelemetryStage } from "../../telemetry/types.js";
import cliLogger from "../logger.js";
import calculateOutDirSize from "../services/calculate-outdir-size.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import { startProgress } from "../services/progress.js";

/**
 * The CLI build command. Responsible for calling the adapters build handler.
 */
const buildCommand = async (options?: {
	silent?: boolean;
	remote?: boolean;
}) => {
	startLoggerBuffering();
	const startTime = cliLogger.startTimer();
	const commandStartedAt = Date.now();
	const silent = options?.silent ?? false;
	let telemetryReporter: CommandTelemetryReporter | undefined;
	let currentStage: TelemetryStage | undefined;
	const progress = startProgress("Preparing build…", silent);

	try {
		const buildProject = await loadBuildProject({
			silent,
			loadEmailTemplates: false,
			prepareRuntime: true,
		});
		const { configPath, loaded: configRes } = buildProject;
		telemetryReporter = createCommandTelemetryReporter({
			config: configRes.config,
			env: configRes.env,
			runtimeContext: configRes.runtimeContext,
			projectRoot: configRes.projectRoot,
			command: "build",
			startedAt: commandStartedAt,
		});
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
			await stopLoggerBuffering();
			await telemetryReporter.report({
				outcome: "failed",
				stage: "runtime_initialization",
			});
			process.exit(1);
		}

		await checkAllPluginsCompatibility({
			runtimeContext: configRes.runtimeContext,
			config: configRes.config,
			translate,
		});

		currentStage = "artifacts";
		await rm(configRes.config.build.outDir, { recursive: true, force: true });
		await mkdir(configRes.config.build.outDir, { recursive: true });

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
			configRes.config.build.outDir,
			configPath,
		);
		const normalisedOutputRelativePath = outputRelativeConfigPath.replace(
			/\.ts$/,
			".js",
		);

		await writeTranslationArtifact({
			translationStore: configRes.translationStore,
			outputPath: configRes.config.build.outDir,
		});

		currentStage = "email_templates";
		progress.update("Preparing email templates and public assets…");
		const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
			prepareEmailTemplates({
				config: configRes.config,
				files: configRes.resources.files.templates,
				silent,
				verbose: true,
			}),
			copyPublicAssets({
				config: configRes.config,
				files: configRes.resources.files.public,
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
			await stopLoggerBuffering();
			await telemetryReporter.report({
				outcome: "failed",
				stage: "email_templates",
			});
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
			await stopLoggerBuffering();
			await telemetryReporter.report({
				outcome: "failed",
				stage: "public_assets",
			});
			process.exit(1);
		}
		const translationStore = configRes.translationStore;

		currentStage = "artifacts";
		progress.update("Preparing build artifacts…");
		const processedArtifacts = await prepareBuildArtifacts({
			config: configRes.config,
			translationStore,
			definition: configRes.definition,
			silent,
			configPath,
			outputPath: configRes.config.build.outDir,
			outputRelativeConfigPath: normalisedOutputRelativePath,
			customArtifactTypes: adapterRuntime.config?.customBuildArtifacts,
		});

		currentStage = "admin_build";
		progress.update("Building admin application…");
		await buildApp({
			config: configRes.config,
			projectRoot: configRes.projectRoot,
			configPath,
			silent,
		});

		currentStage = "runtime_build";
		progress.update("Building server…");
		const runtimeBuildRes = await adapterCLI.build({
			config: configRes.config,
			translationStore,
			definition: configRes.definition,
			configPath,
			outputPath: configRes.config.build.outDir,
			outputRelativeConfigPath: normalisedOutputRelativePath,
			buildArtifacts: processedArtifacts,
			logger: {
				instance: cliLogger,
				silent,
			},
		});

		currentStage = undefined;
		await checkAllPluginsCompatibility({
			runtimeContext: runtimeBuildRes.runtimeContext,
			config: configRes.config,
			translate,
		});

		const relativeBuildPath = path.relative(
			process.cwd(),
			configRes.config.build.outDir,
		);

		cliLogger.info(
			"Admin application built:",
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

		currentStage = "finalize";
		progress.update("Finishing build…");
		await runtimeBuildRes?.onComplete?.();
		const endTime = startTime();

		const distSize = await calculateOutDirSize(configRes.config.build.outDir);
		progress.stop();

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

		await stopLoggerBuffering();
		await telemetryReporter.report({
			outcome: "succeeded",
			stage: "finalize",
		});
		process.exit(0);
	} catch (error) {
		progress.stop();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to build the application");
		} else {
			cliLogger.error("Failed to build the application", "Unknown error");
		}
		await stopLoggerBuffering();
		if (currentStage) {
			await telemetryReporter?.report({
				outcome: "failed",
				stage: currentStage,
			});
		}
		process.exit(1);
	}
};

export default buildCommand;

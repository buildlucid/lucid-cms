import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import buildApp from "../../admin/build-app.js";
import bundleServer from "../../compile/bundle-server.js";
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
import calculateDirectorySize from "../services/calculate-directory-size.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import { startProgress } from "../services/progress.js";
import runPluginBuilds from "../services/run-plugin-builds.js";
import runPluginPrepares from "../services/run-plugin-prepares.js";
import writePluginModules from "../services/write-plugin-modules.js";

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
		await runPluginPrepares({
			command: "build",
			config: configRes.config,
			projectRoot: configRes.projectRoot,
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

		// The admin build empties its folder, so it runs before public files are copied into it.
		currentStage = "admin_build";
		progress.update("Building admin application…");
		await buildApp({
			config: configRes.config,
			projectRoot: configRes.projectRoot,
			configPath,
			silent,
		});

		currentStage = "email_templates";
		progress.update("Preparing email templates and public assets…");
		const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
			prepareEmailTemplates({
				config: configRes.config,
				files: configRes.resources.files.emails,
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

		currentStage = "artifacts";
		progress.update("Building plugin files…");
		const pluginBuilds = await runPluginBuilds({
			config: configRes.config,
			projectRoot: configRes.projectRoot,
			runtime: configRes.adapter.key,
			publicFiles: configRes.resources.files.public,
		});
		const buildDataDirectory = path.resolve(
			configRes.config.build.outDir,
			constants.build.directory,
		);
		await writeFile(
			path.join(buildDataDirectory, constants.build.dataFiles.pluginData),
			JSON.stringify(pluginBuilds.data),
		);
		await writePluginModules(
			path.join(buildDataDirectory, constants.build.dataFiles.pluginModules),
			pluginBuilds.modules,
		);

		currentStage = "runtime_build";
		progress.update("Building server…");
		const runtimeBuild = await adapterCLI.build({
			config: configRes.config,
			configPath,
			outputPath: configRes.config.build.outDir,
			buildArtifacts: processedArtifacts,
			logger: {
				instance: cliLogger,
				silent,
			},
		});
		const serverBundle = await bundleServer({
			configPath,
			outputPath: configRes.config.build.outDir,
			runtimeEntrypoint: adapterRuntime.runtimeEntrypoint,
			build: runtimeBuild,
		});

		currentStage = undefined;
		await checkAllPluginsCompatibility({
			runtimeContext: runtimeBuild.runtimeContext,
			config: configRes.config,
			translate,
		});

		const publicPath = path.join(
			path.relative(process.cwd(), configRes.config.build.outDir),
			constants.directories.public,
		);

		cliLogger.info(
			"Admin application built:",
			cliLogger.color.green(
				`./${path.join(publicPath, constants.directories.admin)}`,
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
		await runtimeBuild.onComplete?.();
		const endTime = startTime();
		const publicSize = await calculateDirectorySize(publicPath);
		// Runtimes that keep packages external ship far less, so say why.
		const externalPackagesNote =
			runtimeBuild.bundle?.packages === "external"
				? ", packages load from node_modules"
				: "";
		progress.stop();

		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			"Build completed",
			"successfully",
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{
				spaceBefore: true,
				silent,
			},
		);
		cliLogger.log(
			"Server",
			cliLogger.color.yellow(cliLogger.formatBytes(serverBundle.size)),
			cliLogger.color.gray(
				`(${cliLogger.formatBytes(serverBundle.gzipSize)} gzipped${externalPackagesNote})`,
			),
			{
				indent: 2,
				symbol: "child",
				silent,
			},
		);
		cliLogger.log(
			"Assets",
			cliLogger.color.yellow(cliLogger.formatBytes(publicSize)),
			cliLogger.color.gray(`(admin and public files in ./${publicPath})`),
			{
				indent: 2,
				symbol: "child",
				spaceAfter: true,
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

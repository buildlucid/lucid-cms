import path from "node:path";
import chokidar from "chokidar";
import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prepareEmailTemplates from "../../email/templates/prepare-email-templates.js";
import { createTranslator } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import checkAllPluginsCompatibility from "../../plugins/check-all-plugins-compatibility.js";
import type { AdapterKeys } from "../../runtime/types.js";
import createCommandTelemetryReporter, {
	type CommandTelemetryReporter,
} from "../../telemetry/command-reporter.js";
import type { TelemetryStage } from "../../telemetry/types.js";
import generateTypes from "../../type-generation/index.js";
import cliLogger from "../logger.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import {
	clearDevScreen,
	getServerUrl,
	logAdminUrl,
	logRestart,
	logServerReady,
} from "../services/server-logger.js";
import updateAvailable from "../services/update-available.js";
import migrateCommand from "./migrate.js";

const devCommand = async (options?: {
	watch?: string | boolean;
	clearScreen?: boolean;
	remote?: boolean;
}) => {
	const configPath = getConfigPath(process.cwd());
	const commandStartedAt = Date.now();

	const coreUpdateAvailable = updateAvailable().catch(() => undefined);

	let serverDestroy: (() => Promise<void>) | undefined;
	let closing = false;
	let ready = false;
	let lastServerUrl: string | undefined;
	let changedFile: string | undefined;
	let restartInputs: Set<string> | undefined;
	let restartRequested = false;
	let restartPromise: Promise<void> | undefined;
	let isInitialRun = true;
	let syncedLocalization: string | undefined;
	let buildOutDir = "dist";
	let buildWatchIgnore: string[] = [];
	let telemetryReporter: CommandTelemetryReporter | undefined;

	const startServer = async () => {
		ready = false;
		const elapsed = cliLogger.startTimer();
		let serverUrl = "unknown";
		if (changedFile) {
			if (options?.clearScreen !== false) clearDevScreen();
			logRestart(
				`${path.relative(process.cwd(), changedFile)} changed, restarting...`,
			);
			changedFile = undefined;
		}
		startLoggerBuffering();
		const reportingInitialRun = isInitialRun;
		let currentStage: TelemetryStage | undefined;
		let startupListening = false;
		let startupCompleted = false;
		let startupAdapterKeys: AdapterKeys | undefined;

		const maybeReportStartup = () => {
			if (
				!reportingInitialRun ||
				!startupListening ||
				!startupCompleted ||
				!startupAdapterKeys
			) {
				return;
			}

			void telemetryReporter?.report({
				outcome: "succeeded",
				stage: "server_listen",
				adapterKeys: startupAdapterKeys,
			});
		};

		try {
			await serverDestroy?.();
			serverDestroy = undefined;

			const configResult = await loadConfigFile({
				path: configPath,
				meta: { admin: "development" },
				collectConfigDependencies: true,
				prepareRuntime: true,
				silent: !reportingInitialRun,
			});
			serverDestroy = configResult.adapter.cli?.dispose;
			restartInputs = new Set([
				...controlFiles,
				...configResult.resources.watch,
				...configResult.configDependencies,
			]);
			watcher.add([...restartInputs]);
			buildOutDir = configResult.config.build.outDir;
			buildWatchIgnore = configResult.config.build.watch?.ignore ?? [];
			if (reportingInitialRun) {
				telemetryReporter ??= createCommandTelemetryReporter({
					config: configResult.config,
					env: configResult.env,
					runtimeContext: configResult.runtimeContext,
					projectRoot: configResult.projectRoot,
					command: "dev",
					startedAt: commandStartedAt,
				});
			}

			const translations = await prepareTranslations({
				config: configResult.config,
				files: configResult.resources.files.translations,
				outputPath: configResult.config.build.outDir,
			});
			const translationStore = translations.translationStore;
			const translate = createTranslator({
				store: translationStore,
				locale: "en",
			});
			const adapterCLI = configResult.adapter.cli;

			if (!adapterCLI) {
				throw new Error(
					`Lucid could not load CLI handlers from the "${configResult.adapter.key}" runtime adapter.`,
				);
			}

			generateTypes({
				envSchema: configResult.envSchema,
				configPath: configPath,
				projectRoot: configResult.projectRoot,
				translationFiles: configResult.resources.files.translations,
				access: configResult.config.access,
				collections: configResult.config.collections,
				localization: configResult.config.localization,
			});

			const localizationKey = JSON.stringify(configResult.config.localization);

			currentStage = "migration";
			const migrateResult = await migrateCommand({
				config: configResult.config,
				migrationFiles: configResult.resources.files.migrations,
				env: configResult.env,
				runtimeContext: configResult.runtimeContext,
				translationStore,
				mode: "return",
			})({
				quiet: !reportingInitialRun,
				//* re-syncs on localisation changes
				skipSyncSteps: !isInitialRun && syncedLocalization === localizationKey,
			});

			if (!migrateResult) {
				throw new Error("Migrations did not complete.");
			}

			syncedLocalization = localizationKey;

			currentStage = "email_templates";
			const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
				prepareEmailTemplates({
					config: configResult.config,
					files: configResult.resources.files.templates,
					silent: false,
					verbose: false,
				}),
				copyPublicAssets({
					config: configResult.config,
					files: configResult.resources.files.public,
					silent: false,
					verbose: false,
				}),
			]);
			if (emailTemplatesRes.error) {
				throw new Error(
					translate.english(emailTemplatesRes.error.message) ??
						"Failed to prepare email templates",
				);
			}
			if (publicAssetsRes.error) {
				currentStage = "public_assets";
				throw new Error(
					translate.english(publicAssetsRes.error.message) ??
						"Failed to copy public assets",
				);
			}

			currentStage = "runtime_initialization";
			const serverRes = await adapterCLI.serve({
				mode: "development",
				configPath,
				projectRoot: configResult.projectRoot,
				env: configResult.env,
				config: configResult.config,
				translationStore,
				logger: {
					instance: cliLogger,
					silent: !reportingInitialRun,
				},
				onListening: async (props) => {
					startupListening = true;
					startupAdapterKeys = props.adapterKeys;
					maybeReportStartup();

					serverUrl = getServerUrl(props.address);
				},
			});
			serverDestroy = serverRes?.destroy;

			currentStage = undefined;
			if (isInitialRun) {
				await checkAllPluginsCompatibility({
					runtimeContext: serverRes.runtimeContext,
					config: configResult.config,
					translate,
				});
			}

			currentStage = "finalize";
			await serverRes?.onComplete?.();
			startupCompleted = true;
			startupAdapterKeys = serverRes.adapterKeys;
			maybeReportStartup();
			ready = true;

			if (!lastServerUrl) {
				logServerReady(serverUrl);
				void coreUpdateAvailable
					.then((update) => {
						if (ready && !closing) update?.renderUpdateBox();
					})
					.catch(() => {});
			} else {
				logRestart(
					`Server restarted in ${cliLogger.formatMilliseconds(elapsed())}`,
				);
				if (serverUrl !== lastServerUrl) logAdminUrl(serverUrl);
			}
			lastServerUrl = serverUrl;

			await stopLoggerBuffering();
			isInitialRun = false;
		} catch (error) {
			restartInputs = undefined;
			await serverDestroy?.();
			serverDestroy = undefined;
			if (error instanceof Error) {
				cliLogger.errorInstance(error, "Failed to start the server");
			} else {
				cliLogger.error("Failed to start the server", "Unknown error");
			}
			await stopLoggerBuffering();
			if (reportingInitialRun && currentStage) {
				await telemetryReporter?.report({
					outcome: "failed",
					stage: currentStage,
				});
			}
			cliLogger.info("Waiting for a file change before retrying...");
		}
	};

	// Coalesce edits while restarting, then run once more with the latest files.
	const requestRestart = () => {
		if (closing) return Promise.resolve();
		restartRequested = true;
		restartPromise ??= (async () => {
			do {
				restartRequested = false;
				await startServer();
			} while (restartRequested && !closing);
		})().finally(() => {
			restartPromise = undefined;
		});
		return restartPromise;
	};

	const watchPath = path.resolve(
		typeof options?.watch === "string" ? options.watch : process.cwd(),
	);
	const controlFiles = [
		configPath,
		...[
			".env",
			".env.local",
			".env.development",
			".env.development.local",
			".dev.vars",
			".dev.vars.local",
			"wrangler.toml",
			"wrangler.json",
			"wrangler.jsonc",
			"package.json",
			"package-lock.json",
			"tsconfig.json",
		].map((file) => path.join(path.dirname(configPath), file)),
	];

	const isRestartInput = (filePath: string) => {
		const absolute = path.resolve(filePath);
		if (
			options?.watch &&
			(absolute === watchPath || absolute.startsWith(`${watchPath}${path.sep}`))
		)
			return true;
		if (!restartInputs)
			return (
				controlFiles.includes(absolute) || /\.[cm]?[jt]sx?$/.test(absolute)
			);
		return [...restartInputs].some(
			(input) =>
				absolute === input || absolute.startsWith(`${input}${path.sep}`),
		);
	};

	const ignoredDirectories = new Set([
		"node_modules",
		".git",
		".lucid",
		".wrangler",
		".mf",
	]);

	const isIgnoredFile = (filePath: string) => {
		const absolute = path.resolve(filePath);
		const relative = path.relative(watchPath, absolute);
		const output = path.resolve(buildOutDir);
		const uploads = path.resolve(constants.defaultUploadDirectory);
		return (
			path.basename(absolute) === "wrangler.lucid.jsonc" ||
			absolute.split(path.sep).some((part) => ignoredDirectories.has(part)) ||
			absolute === output ||
			absolute.startsWith(`${output}${path.sep}`) ||
			absolute === uploads ||
			absolute.startsWith(`${uploads}${path.sep}`) ||
			/\.(sqlite(?:-shm|-wal)?|log)$/.test(absolute) ||
			buildWatchIgnore.some((pattern) => path.matchesGlob(relative, pattern))
		);
	};

	const watcher = chokidar.watch([watchPath, configPath], {
		ignored: isIgnoredFile,
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 25 },
	});

	let restartTimer: NodeJS.Timeout | undefined;

	watcher.on("all", (event, filePath) => {
		if (
			!["add", "change", "unlink"].includes(event) ||
			isIgnoredFile(filePath) ||
			!isRestartInput(filePath)
		) {
			return;
		}

		changedFile = filePath;
		if (restartTimer) clearTimeout(restartTimer);

		restartTimer = setTimeout(() => {
			void requestRestart();
		}, 100);
	});

	let shutdownPromise: Promise<void> | undefined;
	const shutdown = () => {
		closing = true;
		shutdownPromise ??= (async () => {
			try {
				if (restartTimer) clearTimeout(restartTimer);
				await watcher.close();
				await restartPromise;
				await serverDestroy?.();
			} catch (error) {
				cliLogger.error(
					"Error during shutdown",
					error instanceof Error ? error.message : String(error),
				);
			} finally {
				await stopLoggerBuffering();
				process.exit(0);
			}
		})();
		return shutdownPromise;
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGHUP", shutdown);
	await requestRestart();
};

export default devCommand;

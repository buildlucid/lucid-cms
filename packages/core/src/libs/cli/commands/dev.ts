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
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import cliLogger from "../logger.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import updateAvailable from "../services/update-available.js";
import validateEnvVars from "../services/validate-env-vars.js";
import migrateCommand from "./migrate.js";

const devCommand = async (options?: {
	watch?: string | boolean;
	remote?: boolean;
}) => {
	const configPath = getConfigPath(process.cwd());

	const coreUpdateAvailable = updateAvailable();

	let serverDestroy: (() => Promise<void>) | undefined;
	let rebuilding = false;
	let isInitialRun = true;
	let buildOutDir = "dist";
	let buildWatchIgnore: string[] = [];

	const startServer = async () => {
		if (rebuilding) return;
		rebuilding = true;

		startLoggerBuffering();

		try {
			await serverDestroy?.();

			const configResult = await loadConfigFile({
				path: configPath,
				prepareRuntime: true,
			});
			buildOutDir = configResult.config.build.paths.outDir;
			buildWatchIgnore = configResult.config.build.watch?.ignore ?? [];

			const translations = await prepareTranslations({
				config: configResult.config,
				projectRoot: configResult.projectRoot,
				outputPath: configResult.config.build.paths.outDir,
			});
			const translationStore = translations.translationStore;
			const translate = createTranslator({
				store: translationStore,
				locale: "en",
			});
			const adapterCLI = configResult.adapter.cli;

			if (!adapterCLI) {
				cliLogger.error(
					`Lucid could not load CLI handlers from the "${configResult.adapter.key}" runtime adapter.`,
				);
				await stopLoggerBuffering();
				process.exit(1);
			}

			const envValid = await validateEnvVars({
				envSchema: configResult.envSchema,
				env: configResult.env,
			});

			generateTypes({
				envSchema: configResult.envSchema,
				configPath: configPath,
				projectRoot: configResult.projectRoot,
				collections: configResult.config.collections,
				localization: configResult.config.localization,
			});

			if (!envValid) {
				await stopLoggerBuffering();
				process.exit(1);
			}

			const migrateResult = await migrateCommand({
				config: configResult.config,
				env: configResult.env,
				runtimeContext: configResult.runtimeContext,
				translationStore,
				projectRoot: configResult.projectRoot,
				mode: "return",
			})({
				skipSyncSteps: !isInitialRun,
				skipEnvValidation: true,
			});

			if (!migrateResult) {
				await stopLoggerBuffering();
				process.exit(2);
			}

			const viteBuildRes = await vite.buildApp(configResult.config);
			if (viteBuildRes.error) {
				cliLogger.error(
					translate.english(viteBuildRes.error.message) ??
						"Failed to build app",
				);
				await stopLoggerBuffering();
				rebuilding = false;
				return;
			}

			const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
				prepareEmailTemplates({
					config: configResult.config,
					silent: false,
					verbose: false,
				}),
				copyPublicAssets({
					config: configResult.config,
					silent: false,
					verbose: false,
				}),
			]);
			if (emailTemplatesRes.error) {
				cliLogger.error(
					translate.english(emailTemplatesRes.error.message) ??
						"Failed to prepare email templates",
				);
				await stopLoggerBuffering();
				rebuilding = false;
				return;
			}
			if (publicAssetsRes.error) {
				cliLogger.error(
					translate.english(publicAssetsRes.error.message) ??
						"Failed to copy public assets",
				);
				await stopLoggerBuffering();
				rebuilding = false;
				return;
			}
			process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
			cliLogger.success(
				"Email templates and public assets prepared",
				cliLogger.color.green("successfully"),
			);

			const serverRes = await adapterCLI.serve({
				config: configResult.config,
				translationStore,
				logger: {
					instance: cliLogger,
					silent: false,
				},
				onListening: async (props) => {
					const serverUrl =
						typeof props.address === "string"
							? props.address
							: props.address
								? `http://${props.address.address === "::" ? "localhost" : props.address.address}:${props.address.port}`
								: "unknown";

					const coreUpdateAvailabeRes = await coreUpdateAvailable;
					coreUpdateAvailabeRes.renderUpdateBox();

					cliLogger.log(
						cliLogger.createBadge("LUCID CMS"),
						"Development server ready",
						{
							spaceBefore: !coreUpdateAvailabeRes.show,
							spaceAfter: true,
						},
					);

					cliLogger.log(
						"🔐 Admin panel      ",
						cliLogger.color.blue(`${serverUrl}/lucid`),
						{ symbol: "line" },
					);

					cliLogger.log(
						"📖 Documentation    ",
						cliLogger.color.blue(constants.documentation),
						{ symbol: "line" },
					);

					cliLogger.log(
						cliLogger.color.gray("Press CTRL-C to stop the server"),
						{ spaceBefore: true, spaceAfter: true },
					);

					await stopLoggerBuffering();
				},
			});
			serverDestroy = serverRes?.destroy;

			if (isInitialRun) {
				await checkAllPluginsCompatibility({
					runtimeContext: serverRes.runtimeContext,
					config: configResult.config,
				});
			}

			await serverRes?.onComplete?.();
			isInitialRun = false;
		} catch (error) {
			await serverDestroy?.();
			if (error instanceof Error) {
				cliLogger.errorInstance(error);
			}
			cliLogger.error("Failed to start the server");
			await stopLoggerBuffering();
			process.exit(1);
		} finally {
			rebuilding = false;
		}
	};

	await startServer();

	let restartTimer: NodeJS.Timeout | undefined;

	const watchPath =
		typeof options?.watch === "string" ? options?.watch : process.cwd();

	const distPath = path.join(process.cwd(), buildOutDir);

	const ignorePatterns = [
		"**/node_modules/**",
		"**/.git/**",
		"**/.lucid/**",
		"**/.wrangler/**",
		"**/.mf/**",
		distPath,
		"**/*.log",
		"**/.DS_Store",
		"**/Thumbs.db",
		"*.sqlite",
		"*.sqlite-shm",
		"*.sqlite-wal",
		"**/*.sqlite",
		"**/*.sqlite-shm",
		"**/*.sqlite-wal",
		`${constants.defaultUploadDirectory}/**`,
		...buildWatchIgnore,
	];

	const isIgnoredFile = (filePath: string) => {
		const relativePath = path.relative(watchPath, filePath);
		return ignorePatterns.some((pattern) =>
			path.matchesGlob(relativePath, pattern),
		);
	};

	const watcher = chokidar
		.watch([watchPath, configPath], {
			ignored: ignorePatterns,
			ignoreInitial: true,
			persistent: true,
			usePolling: false,
			awaitWriteFinish: {
				stabilityThreshold: 100,
			},
		})
		.on("change", (changedPath) => {
			if (changedPath === configPath) {
				cliLogger.info("Config file changed, reloading...");
			}
			if (isIgnoredFile(changedPath)) return;
			startServer();
		})
		.on("add", (addedPath) => {
			if (isIgnoredFile(addedPath)) return;
			startServer();
		})
		.on("unlink", (deletedPath) => {
			if (isIgnoredFile(deletedPath)) return;
			startServer();
		});

	const shutdown = async () => {
		try {
			if (restartTimer) clearTimeout(restartTimer);
			await watcher?.close();
			await serverDestroy?.();
		} catch (error) {
			cliLogger.error("Error during shutdown");
			if (error instanceof Error) {
				cliLogger.error(error.message);
			}
		} finally {
			await stopLoggerBuffering();
			process.exit(0);
		}
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGHUP", shutdown);
};

export default devCommand;

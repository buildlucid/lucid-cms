import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import { minimatch } from "minimatch";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prerenderMjmlTemplates from "../../email-adapter/templates/prerender-mjml-templates.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import createDevLogger from "../logger/dev-logger.js";
import copyPublicAssets from "../utils/copy-public-assets.js";
import validateEnvVars from "../utils/validate-env-vars.js";
import migrateCommand from "./migrate.js";
import logger from "../../logger/index.js";

const devCommand = async (options?: { watch?: string | boolean }) => {
	const devLogger = createDevLogger();
	const configPath = getConfigPath(process.cwd());

	let serverDestroy: (() => Promise<void>) | undefined;
	let rebuilding = false;
	let isInitialRun = true;

	const currentConfig = await loadConfigFile({ path: configPath });

	const startServer = async () => {
		if (rebuilding) return;
		rebuilding = true;

		logger.setBuffering(true);

		try {
			await serverDestroy?.();

			const configResult = await loadConfigFile({ path: configPath });

			const [envValid] = await Promise.all([
				validateEnvVars({
					envSchema: configResult.envSchema,
					env: configResult.env,
				}),
			]);

			generateTypes({
				envSchema: configResult.envSchema,
				configPath: configPath,
			});

			if (!envValid.success) {
				devLogger.envValidationFailed(envValid.message);
				logger.setBuffering(false);
				process.exit(1);
			}

			const migrateResult = await migrateCommand({
				config: configResult.config,
				mode: "return",
			})({
				skipSyncSteps: !isInitialRun,
				skipEnvValidation: true,
			});

			if (!migrateResult) {
				logger.setBuffering(false);
				process.exit(2);
			}

			isInitialRun = false;

			const viteBuildRes = await vite.buildApp(configResult.config);
			if (viteBuildRes.error) {
				devLogger.error(
					viteBuildRes.error.message ?? "Failed to build app",
					viteBuildRes.error,
				);
				logger.setBuffering(false);
				rebuilding = false;
				return;
			}

			await Promise.all([
				prerenderMjmlTemplates(configResult.config),
				copyPublicAssets(configResult.config),
			]);

			console.clear();

			const serverRes = await configResult.adapter?.cli?.serve({
				config: configResult.config,
				logger: devLogger,
				onListening: async (props) => {
					devLogger.serverStarted(props.address);
					logger.setBuffering(false);
				},
			});

			serverDestroy = serverRes?.destroy;
			await serverRes?.onComplete?.();
		} catch (error) {
			devLogger.error("Failed to start server", error);
			logger.setBuffering(false);
		} finally {
			rebuilding = false;
		}
	};

	await startServer();

	let restartTimer: NodeJS.Timeout | undefined;

	const watchPath =
		typeof options?.watch === "string" ? options?.watch : process.cwd();

	const distPath = path.join(
		process.cwd(),
		currentConfig.config.compilerOptions.paths.outDir,
	);

	const ignorePatterns = [
		"**/node_modules/**",
		"**/.git/**",
		"**/.lucid/**",
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
		...(currentConfig.config.compilerOptions.watch?.ignore ?? []),
	];

	const isIgnoredFile = (filePath: string) => {
		const relativePath = path.relative(watchPath, filePath);
		return ignorePatterns.some((pattern) => minimatch(relativePath, pattern));
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
				devLogger.info("Config file changed, reloading...");
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
			devLogger.error("Error during shutdown", error);
		} finally {
			logger.setBuffering(false);
			process.exit(0);
		}
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGHUP", shutdown);
};

export default devCommand;

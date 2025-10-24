import path from "node:path";
import chokidar from "chokidar";
import { minimatch } from "minimatch";
import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prerenderMjmlTemplates from "../../email-adapter/templates/prerender-mjml-templates.js";
import logger from "../../logger/index.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import cliLogger from "../logger.js";
import copyPublicAssets from "../utils/copy-public-assets.js";
import validateEnvVars from "../utils/validate-env-vars.js";
import migrateCommand from "./migrate.js";

const devCommand = async (options?: { watch?: string | boolean }) => {
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
				cliLogger.error("Environment variable validation failed");
				envValid.message && cliLogger.error(envValid.message);
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
				cliLogger.error(viteBuildRes.error.message ?? "Failed to build app");
				logger.setBuffering(false);
				rebuilding = false;
				return;
			}

			await Promise.all([
				prerenderMjmlTemplates(configResult.config),
				copyPublicAssets(configResult.config),
			]);

			process.stdout.write("\x1B[2J\x1B[3J\x1B[H");

			const serverRes = await configResult.adapter?.cli?.serve({
				config: configResult.config,
				logger: cliLogger,
				onListening: async (props) => {
					const serverUrl =
						typeof props.address === "string"
							? props.address
							: props.address
								? `http://${props.address.address === "::" ? "localhost" : props.address.address}:${props.address.port}`
								: "unknown";

					cliLogger.log(
						cliLogger.createBadge("LUCID CMS"),
						"Development server ready",
						{
							spaceBefore: true,
							spaceAfter: true,
						},
					);

					cliLogger.log(
						"🔐 Admin panel      ",
						cliLogger.color.blue(`${serverUrl}/admin`),
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
					logger.setBuffering(false);
				},
			});

			serverDestroy = serverRes?.destroy;
			await serverRes?.onComplete?.();
		} catch (error) {
			cliLogger.error("Failed to start the server");
			if (error instanceof Error) {
				cliLogger.errorInstance(error);
			}
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
		`${constants.defaultUploadDirectory}/**`,
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
			logger.setBuffering(false);
			process.exit(0);
		}
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
	process.on("SIGHUP", shutdown);
};

export default devCommand;

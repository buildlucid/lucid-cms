import chokidar, { type FSWatcher } from "chokidar";
import { spawn } from "node:child_process";
import installOptionalDeps from "../utils/install-optional-deps.js";
import createDevLogger from "../logger/dev-logger.js";
import path from "node:path";
import { minimatch } from "minimatch";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";

/**
 * The CLI dev command. Watches for file changes and spawns child processes running the serve command for hot-reloading.
 */
const devCommand = async (options?: {
	watch?: string | boolean;
}) => {
	await installOptionalDeps();
	const logger = createDevLogger();
	let childProcess: ReturnType<typeof spawn> | undefined = undefined;
	let rebuilding = false;
	let startupTimer: NodeJS.Timeout | undefined = undefined;
	let isInitialRun = true;

	const configPath = getConfigPath(process.cwd());
	//* this will get cached so will mostly affect startup time only, it does mean the compilerOptions will not get updated if the config changes
	const configRes = await loadConfigFile({
		path: configPath,
	});

	/**
	 * Kills the child process
	 */
	const killChildProcess = async (): Promise<void> => {
		if (!childProcess) return;

		return new Promise<void>((resolve) => {
			const cleanup = () => {
				childProcess = undefined;
				resolve();
			};

			const forceKillTimer = setTimeout(() => {
				if (childProcess && !childProcess.killed) {
					childProcess.kill("SIGKILL");
				}
				cleanup();
			}, 2000);

			childProcess?.once("exit", () => {
				clearTimeout(forceKillTimer);
				cleanup();
			});
			childProcess?.kill("SIGTERM");
		});
	};

	/**
	 * Starts the serve command in a child process
	 */
	const startChildServer = async () => {
		if (rebuilding) return;
		rebuilding = true;

		if (startupTimer) clearTimeout(startupTimer);

		await killChildProcess();

		await new Promise((resolve) => setTimeout(resolve, 100));

		try {
			const args = [process.argv[1] as string, "serve"];
			if (isInitialRun) {
				args.push("--initial");
				isInitialRun = false;
			}

			childProcess = spawn(process.execPath, args, {
				stdio: ["inherit", "inherit", "inherit"],
				// env: { ...process.env },
				detached: false,
			});

			childProcess.on("error", (error) => {
				logger.error("Failed to start server", error);
				rebuilding = false;
			});

			childProcess.on("spawn", () => {
				console.clear();
			});

			childProcess.on("exit", (code, signal) => {
				rebuilding = false;
				//* exit code 2 = migration cancelled, exit dev process
				if (code === 2) process.exit(0);

				if (signal !== "SIGTERM" && signal !== "SIGKILL" && code !== 0) {
					logger.error(`Server exited with code ${code} and signal ${signal}`);
				}
				rebuilding = false;
			});

			startupTimer = setTimeout(() => {
				rebuilding = false;
			}, 200);
		} catch (error) {
			logger.error("Failed to spawn server process", error);
			rebuilding = false;
		}
	};
	await startChildServer();

	/**
	 * Debounced restart function to avoid rapid restarts
	 */
	let restartTimer: NodeJS.Timeout | undefined = undefined;
	const debouncedRestart = () => {
		if (restartTimer) {
			clearTimeout(restartTimer);
		}
		restartTimer = setTimeout(() => {
			startChildServer();
		}, 150);
	};

	/**
	 * Sets up the shutdown handlers.
	 */
	const setupShutdownHandlers = (watcher?: FSWatcher) => {
		const shutdown = async () => {
			try {
				if (startupTimer) clearTimeout(startupTimer);
				if (restartTimer) clearTimeout(restartTimer);

				await watcher?.close();

				await killChildProcess();
			} catch (error) {
				logger.error("Error during shutdown", error);
			} finally {
				process.exit(0);
			}
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
		process.on("SIGHUP", shutdown);
	};

	const watchPath =
		typeof options?.watch === "string" ? options?.watch : process.cwd();

	const distPath = path.join(
		process.cwd(),
		configRes.config.compilerOptions.paths.outDir,
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
		...(configRes.config.compilerOptions.watch?.ignore ?? []),
	];

	const isIgnoredFile = (filePath: string) => {
		const relativePath = path.relative(watchPath, filePath);
		return ignorePatterns.some((pattern) => minimatch(relativePath, pattern));
	};

	const watcher = chokidar
		.watch(watchPath, {
			ignored: ignorePatterns,
			ignoreInitial: true,
			persistent: true,
			usePolling: false,
			awaitWriteFinish: {
				stabilityThreshold: 100,
			},
		})
		.on("change", (e) => {
			if (isIgnoredFile(e)) return;
			debouncedRestart();
		})
		.on("add", (e) => {
			if (isIgnoredFile(e)) return;
			debouncedRestart();
		})
		.on("unlink", (e) => {
			if (isIgnoredFile(e)) return;
			debouncedRestart();
		});

	setupShutdownHandlers(watcher);
};

export default devCommand;

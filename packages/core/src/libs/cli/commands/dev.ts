import chokidar, { type FSWatcher } from "chokidar";
import { spawn } from "node:child_process";
import installOptionalDeps from "../utils/install-optional-deps.js";
import createDevLogger from "../logger/dev-logger.js";
import path from "node:path";

export type DevOptions = {
	watch?: string | boolean;
};

/**
 * The CLI dev command. Watches for file changes and spawns child processes
 * running the serve command for hot-reloading.
 */
const devCommand = async (options: DevOptions) => {
	await installOptionalDeps();
	const logger = createDevLogger();
	let childProcess: ReturnType<typeof spawn> | undefined = undefined;
	let rebuilding = false;
	let startupTimer: NodeJS.Timeout | undefined = undefined;

	/**
	 * Kills the child process with improved cleanup
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

		console.log("🔄 Restarting server...");

		await killChildProcess();

		// Add a small delay to ensure clean process termination
		await new Promise((resolve) => setTimeout(resolve, 100));

		try {
			childProcess = spawn(
				process.execPath,
				[process.argv[1] as string, "serve"],
				{
					stdio: ["inherit", "inherit", "inherit"],
					// env: { ...process.env },
					detached: false,
				},
			);

			childProcess.on("error", (error) => {
				logger.error("Failed to start server", error);
				rebuilding = false;
			});

			childProcess.on("spawn", () => {
				console.clear();
			});

			childProcess.on("exit", (code, signal) => {
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
		typeof options.watch === "string" ? options.watch : process.cwd();
	// TODO: this needs to be configurable, ideally grab from lucid.config
	const distPath = path.join(process.cwd(), "dist");

	const watcher = chokidar.watch(watchPath, {
		ignored: [
			"**/node_modules/**",
			"**/.git/**",
			"**/build/**",
			"**/.lucid/**",
			"**/uploads/**",
			distPath,
			"**/*.log",
			"**/.DS_Store",
			"**/Thumbs.db",
		],
		ignoreInitial: true,
		persistent: true,
		usePolling: false,
		awaitWriteFinish: {
			stabilityThreshold: 100,
			pollInterval: 50,
		},
	});

	watcher.on("change", debouncedRestart);
	watcher.on("add", debouncedRestart);
	watcher.on("unlink", debouncedRestart);

	setupShutdownHandlers(watcher);
};

export default devCommand;

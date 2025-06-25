import chokidar, { type FSWatcher } from "chokidar";
import loadConfigFile from "../../config/load-config-file.js";
import getConfigPath from "../../config/get-config-path.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";
import createDevLogger from "../logger/dev-logger.js";

export type DevOptions = {
	watch?: string | boolean;
};

/**
 * The CLI dev command. Responsible for calling the adapters dev handler, and watching for file changes.
 */
const devCommand = async (options: DevOptions) => {
	await installOptionalDeps();
	const configPath = getConfigPath(process.cwd());

	let res: Awaited<ReturnType<typeof loadConfigFile>> | undefined = undefined;
	let rebuilding = false;
	let destroy: (() => Promise<void>) | undefined = undefined;
	const logger = createDevLogger();

	const runAdapterDev = async (changedPath: string) => {
		if (rebuilding) return;
		rebuilding = true;

		console.clear();

		if (changedPath === configPath || !res) {
			res = await loadConfigFile({
				path: configPath,
			});
			await prerenderMjmlTemplates(res.config);
		}

		try {
			if (destroy) {
				await destroy();
			}
			destroy = await res.adapter?.cli?.serve(res.config, logger);
		} catch (error) {
			logger.error("Restart failed", error);
		} finally {
			rebuilding = false;
		}
	};

	runAdapterDev(configPath);

	/**
	 * Sets up the shutdown handlers.
	 * - Closes the watcher
	 * - Destroys the previous dev command
	 * - Exits the process
	 */
	const setupShutdownHandlers = (watcher?: FSWatcher) => {
		const shutdown = async () => {
			try {
				await watcher?.close();
				await destroy?.();
			} catch (error) {
				logger.error("Error during shutdown", error);
			}
			process.exit(0);
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
	};

	//* Watch for file changes
	if (options.watch !== undefined) {
		const watchPath =
			typeof options.watch === "string" ? options.watch : process.cwd();
		const watcher = chokidar.watch(watchPath, {
			ignored: [
				"**/node_modules/**",
				"**/.git/**",
				// `**/${res?.config.compilerOptions?.outDir}/**`,
				"**/build/**",
				"**/.lucid/**",
				"**/uploads/**",
			],
			ignoreInitial: true,
			persistent: true,
		});

		watcher.on("change", runAdapterDev);
		setupShutdownHandlers(watcher);
	} else {
		setupShutdownHandlers();
	}
};

export default devCommand;

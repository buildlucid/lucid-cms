import chokidar, { type FSWatcher } from "chokidar";
import getConfig from "../../config/get-config.js";
import getConfigPath from "../../config/get-config-path.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";

export type DevOptions = {
	watch?: string | boolean;
};

/**
 * The CLI dev command. Responsible for calling the adatpers dev handler, and watching for file changes.
 */
const devCommand = async (options: DevOptions) => {
	await installOptionalDeps();
	const configPath = getConfigPath(process.cwd());

	let config = await getConfig({ path: configPath });
	let rebuilding = false;
	let destroy: (() => Promise<void>) | undefined = undefined;

	await prerenderMjmlTemplates(config);

	/**
	 * Runs the adapter dev command.
	 * - Loads the conifg if changed
	 * - Destroys the previous dev command
	 * - Runs the new dev command
	 */
	const runAdapterDev = async (changedPath?: string) => {
		if (rebuilding) return;
		rebuilding = true;
		console.clear();

		if (changedPath === configPath) {
			config = await getConfig({ path: configPath });
		}

		try {
			await destroy?.();
			destroy = await config?.adapter.cli?.serve(config);
		} catch (error) {
			console.error("❌ Restart failed:", error);
		} finally {
			rebuilding = false;
		}
	};
	runAdapterDev();

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
				console.error("Error during shutdown:", error);
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
				`**/${config.compilerOptions?.outDir}/**`,
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

import chokidar, { type FSWatcher } from "chokidar";
import type { FastifyInstance } from "fastify";
import getConfig from "../../config/get-config.js";
import vite from "../../vite/index.js";
import { start } from "../../fastify/server.js";
import getConfigPath from "../../config/get-config-path.js";

type DevOptions = {
	watch?: string | boolean;
};

const devCommand = async (options: DevOptions) => {
	const configPath = getConfigPath(process.cwd());
	let config = await getConfig({ path: configPath });
	let fastifyInstance: FastifyInstance | null = null;
	let rebuilding = false;

	const buildAndStart = async (newConfig = config) => {
		if (fastifyInstance) {
			//* restart when server already running
			await fastifyInstance.close();
			fastifyInstance = null;
		}

		const buildResponse = await vite.buildApp(newConfig);
		if (buildResponse.error) {
			console.error(buildResponse.error.message);
			return false;
		}

		fastifyInstance = await start({ lucidConfig: newConfig });
		return true;
	};

	const handleFileChange = async (changedPath: string) => {
		if (rebuilding) return;
		rebuilding = true;

		console.clear();

		//* restart when config file changes
		if (changedPath === configPath) {
			config = await getConfig({ path: configPath });
		}

		try {
			await buildAndStart(config);
		} catch (error) {
			console.error("❌ Restart failed:", error);
		} finally {
			rebuilding = false;
		}
	};

	const setupShutdownHandlers = (watcher?: FSWatcher) => {
		const shutdown = async () => {
			try {
				await watcher?.close();
				await fastifyInstance?.close();
			} catch (error) {
				console.error("Error during shutdown:", error);
			}
			process.exit(0);
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
	};

	//* restart when initial build fails
	const success = await buildAndStart();
	if (!success) process.exit(1);

	if (options.watch !== undefined) {
		const watchPath =
			typeof options.watch === "string" ? options.watch : process.cwd();

		const watcher = chokidar.watch(watchPath, {
			ignored: [
				"**/node_modules/**",
				"**/.git/**",
				"**/dist/**",
				"**/build/**",
				"**/.lucid/**",
				"**/uploads/**",
			],
			ignoreInitial: true,
			persistent: true,
		});

		watcher.on("change", handleFileChange);
		setupShutdownHandlers(watcher);
	} else {
		setupShutdownHandlers();
	}
};

export default devCommand;

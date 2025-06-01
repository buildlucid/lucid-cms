import chokidar, { type FSWatcher } from "chokidar";
import { serve, type HttpBindings } from "@hono/node-server";
import getConfig from "../../config/get-config.js";
import vite from "../../vite/index.js";
import getConfigPath from "../../config/get-config-path.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import createApp from "../../http/app.js";

type DevOptions = {
	watch?: string | boolean;
};

/**
 * @todo integrate with runtime adapters instead of relying on node server.
 */
const devCommand = async (options: DevOptions) => {
	await installOptionalDeps();
	const configPath = getConfigPath(process.cwd());
	let config = await getConfig({ path: configPath });
	let server: ReturnType<typeof serve> | null = null;
	let rebuilding = false;

	const buildAndStart = async (newConfig = config) => {
		if (server) {
			//* restart when server already running
			server.close();
			server = null;
		}

		const buildResponse = await vite.buildApp(newConfig);
		if (buildResponse.error) {
			console.error(buildResponse.error.message);
			return false;
		}

		const app = await createApp({ config: newConfig });
		server = serve({
			fetch: app.fetch,
			port: 8080,
		});

		server.on("listening", () => {
			console.log("Server is running at http://localhost:8080");
		});

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
				if (server) {
					server.close();
				}
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

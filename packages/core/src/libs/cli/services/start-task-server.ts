import http from "node:http";
import path from "node:path";
import { createServer } from "vite";
import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import readConfigHost from "../../config/read-config-host.js";
import createTaskClient, {
	type RuntimeTaskClient,
} from "../../vite/create-task-client.js";
import findLucidViteApi from "../../vite/find-lucid-vite-api.js";
import loadHostCli from "../../vite/load-host-cli.js";
import cliSpinner from "../spinner.js";
import createViteConfig from "./create-vite-config.js";
import createViteLogger from "./create-vite-logger.js";

export type TaskServerOptions = {
	/** Connects the runtime's bindings to their deployed resources, for `--remote`. */
	remote?: boolean;
	/** Vite env mode, defaulting to `development`, with `production` for `serve` so tasks use the build's resources. */
	mode?: string;
};

/** A Vite dev server that runs one command's runtime tasks. */
export type TaskServer = {
	run: RuntimeTaskClient;
	close: () => Promise<void>;
};

/** Starts tasks through Lucid's Vite config, or the declared host's, with runtime bindings, isolated cache, a free local port and no watcher or HMR socket, restoring `NODE_ENV` on close. */
const startTaskServer = async (
	options?: TaskServerOptions,
): Promise<TaskServer> => {
	const nodeEnv = process.env.NODE_ENV;
	const restoreNodeEnv = () => {
		if (nodeEnv === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = nodeEnv;
	};

	const configPath = getConfigPath(process.cwd());
	const mode = options?.mode ?? "development";

	// Callers stop the spinner once they've run their tasks.
	cliSpinner.start("Loading project");
	const host = await readConfigHost(configPath);
	const hostCli = host && (await loadHostCli(host, path.dirname(configPath)));
	const config = hostCli
		? {
				...(await hostCli.viteConfig({ configPath, remote: options?.remote })),
				configFile: false as const,
				// Lucid's logger leaves out Vite's routine messages, but keeps tasks' output, which runtimes may log through it.
				customLogger: createViteLogger(),
			}
		: createViteConfig({ configPath, mode, remote: options?.remote });

	const server = await createServer({
		...config,
		// Names this server for Lucid's plugin, which then skips preparing the project and has the runtime print only
		// errors and run jobs inline rather than starting the configured queue.
		plugins: [
			...(config.plugins ?? []),
			{
				name: constants.dev.taskServerPlugin,
				// The project has loaded by now, and the runtime's server environment starts next.
				configResolved: (resolved) => {
					cliSpinner.start(findLucidViteApi(resolved.plugins).startMessage);
				},
			},
		],
		mode,
		clearScreen: false,
		cacheDir: path.join(config.cacheDir ?? "node_modules/.vite", "lucid-tasks"),
		// HMR stays on without a socket or watcher, so the runtime can send its logs over the hot channel.
		server: {
			...config.server,
			middlewareMode: true,
			ws: false,
			watch: null,
		},
	});

	const listener = http.createServer(server.middlewares);
	const close = async () => {
		listener.closeAllConnections();
		await new Promise<void>((resolve) => listener.close(() => resolve()));
		await server.close();
		restoreNodeEnv();
	};

	try {
		await new Promise<void>((resolve, reject) => {
			listener.once("error", reject);
			listener.listen(0, "127.0.0.1", resolve);
		});

		const address = listener.address();
		if (!address || typeof address === "string") {
			throw new Error("The task server did not get a local port.");
		}

		return {
			run: createTaskClient({
				origin: `http://127.0.0.1:${address.port}`,
				token: findLucidViteApi(server.config.plugins).token,
			}),
			close,
		};
	} catch (error) {
		await close();
		throw error;
	}
};

export default startTaskServer;

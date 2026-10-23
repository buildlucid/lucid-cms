import { isIPv6 } from "node:net";
import type { Plugin, ViteDevServer } from "vite";
import constants from "../../constants/constants.js";
import cliLogger from "../cli/logger.js";
import { startLoggerBuffering, stopLoggerBuffering } from "../logger/index.js";
import createTaskClient from "./create-task-client.js";
import runMigrateTask from "./run-migrate-task.js";
import type { LucidPluginProps } from "./types.js";
import writeRuntimeLog from "./write-runtime-log.js";

/** Builds the dev server's origin from its listening address, for requests the plugin sends to itself. */
const getOrigin = (server: ViteDevServer) => {
	const address = server.httpServer?.address();
	if (!address || typeof address === "string") return undefined;

	const protocol = server.config.server.https ? "https" : "http";

	// A wildcard address answers on loopback too, while a specific interface only answers on its own address.
	const host =
		address.address === "0.0.0.0" || address.address === "::"
			? "localhost"
			: address.address;
	return `${protocol}://${isIPv6(host) ? `[${host}]` : host}:${address.port}`;
};

/** Runs development migrations quietly when unchanged before serving requests, reports completion through `onReady`, then flushes runtime logs after host startup output, leaving middleware hosts to migrate themselves. */
const lucidDevPlugin = (
	props: LucidPluginProps & { onReady: (ready: boolean) => void },
): Plugin => ({
	name: "lucid:dev",
	apply: "serve",
	configureServer(server) {
		for (const environment of Object.values(server.environments)) {
			if (environment.config.consumer !== "server") continue;
			environment.hot.on(constants.dev.logEvent, writeRuntimeLog);
		}

		let markReady: (ready: boolean) => void = () => {};
		const ready = new Promise<boolean>((resolve) => {
			markReady = (value) => {
				resolve(value);
				props.onReady(value);
			};
		});

		server.middlewares.use(async (request, response, next) => {
			if (request.headers[constants.dev.taskTokenHeader]) return next();
			if (await ready) return next();

			response.statusCode = 503;
			response.setHeader("Content-Type", "text/plain; charset=utf-8");
			response.end(
				"Lucid's migrations did not complete. Check the terminal, then save a file to retry.",
			);
		});

		const httpServer = server.httpServer;
		if (!httpServer) {
			markReady(true);
			return;
		}

		startLoggerBuffering();
		void ready.then(() => {
			setTimeout(() => void stopLoggerBuffering());
		});

		httpServer.once("listening", () => {
			const origin = getOrigin(server);
			if (!origin) {
				markReady(false);
				return;
			}

			runMigrateTask(createTaskClient({ origin, token: props.token }), {
				quiet: true,
			})
				.then((result) => result.status === "complete")
				.catch((error: unknown) => {
					cliLogger.errorInstance(
						error instanceof Error ? error : new Error(String(error)),
						"Migrations failed",
					);
					return false;
				})
				.then(markReady);
		});
	},
});

export default lucidDevPlugin;

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	type Connect,
	createLogger,
	createServer,
	type HttpServer,
} from "vite";
import {
	type AdminConfigOptions,
	adminRoot,
	createAdminConfig,
} from "./config.js";

/** Attaches admin transforms and HMR to an existing host HTTP server. */
export const createAdminDevServer = async (
	options: AdminConfigOptions & {
		server: HttpServer;
		/** Optional output sink for hosts that buffer startup messages. */
		loggerConsole?: Console;
	},
) => {
	const config = createAdminConfig(options);

	const vite = await createServer({
		...config,
		mode: "development",
		customLogger: options.loggerConsole
			? createLogger("info", {
					allowClearScreen: false,
					console: options.loggerConsole,
				})
			: undefined,
		appType: "custom",
		server: {
			...config.server,
			middlewareMode: true,
			// Avoid speculative module requests surviving an early host restart.
			preTransformRequests: false,
			ws: { server: options.server, path: "__hmr" },
		},
	});

	// Vite strips its base from request.url. Restore it before the host handles a miss.
	const middleware: Connect.NextHandleFunction = (request, response, next) => {
		const originalUrl = request.url;
		vite.middlewares(request, response, (error: unknown) => {
			request.url = originalUrl;
			next(error);
		});
	};

	return {
		middleware,
		renderHtml: async (url: string) => {
			const html = await readFile(path.join(adminRoot, "index.html"), "utf8");
			return vite.transformIndexHtml("/lucid/index.html", html, url);
		},
		close: () => vite.close(),
	};
};

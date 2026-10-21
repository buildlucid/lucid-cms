import type { Server, ServerResponse } from "node:http";
import { createAdminDevServer } from "@lucidcms/admin/build";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import createAdminClientConfig from "../../admin/create-client-config.js";
import { writeBufferedLog } from "../../logger/index.js";
import type {
	LucidDevMiddleware,
	LucidPluginCliDev,
} from "../../plugins/types.js";
import {
	createAdminShellResponse,
	isAdminPath,
	shouldServeAdminShell,
} from "../../runtime/admin.js";
import loadPluginClis from "./load-plugin-clis.js";

type CliDev = {
	middleware: LucidDevMiddleware;
	handleResponse: (request: Request, response: Response) => Promise<Response>;
	close: () => Promise<void>;
	/** Data from plugins' `dev`, keyed by plugin key, for `runtimeContext.pluginData`. */
	pluginData: Record<string, unknown>;
};

const fail = (response: ServerResponse, error: unknown, message: string) => {
	response.statusCode = 500;
	response.end(error instanceof Error ? error.message : message);
};

/** Adds the admin's and plugins' development middleware to an adapter-owned HTTP server. */
const createCliDev = async (props: {
	server: Server;
	projectRoot: string;
	configPath: string;
	config: ResolvedLucidConfig;
}): Promise<CliDev> => {
	const admin = await createAdminDevServer({
		server: props.server,
		projectRoot: props.projectRoot,
		configPath: props.configPath,
		admin: props.config.admin,
		clientConfig: createAdminClientConfig(props.config),
		loggerConsole: {
			...console,
			log: (...args: unknown[]) => writeBufferedLog(() => console.log(...args)),
			warn: (...args: unknown[]) =>
				writeBufferedLog(() => console.warn(...args)),
			error: (...args: unknown[]) =>
				writeBufferedLog(() => console.error(...args)),
		},
	});

	const plugins: Array<{ key: string; dev: LucidPluginCliDev }> = [];
	const close = async () => {
		await Promise.allSettled([
			admin.close(),
			...plugins.map((plugin) => plugin.dev.close?.()),
		]);
	};

	try {
		for (const { key, cli } of await loadPluginClis(
			props.config,
			props.projectRoot,
		)) {
			const dev = await cli.hooks?.dev?.({
				server: props.server,
				config: props.config,
				projectRoot: props.projectRoot,
			});
			if (dev) plugins.push({ key, dev });
		}
	} catch (error) {
		await close();
		throw error;
	}

	const pluginMiddleware = plugins.flatMap((plugin) =>
		plugin.dev.middleware ? [plugin.dev.middleware] : [],
	);
	const runPlugins: LucidDevMiddleware = (request, response, next) => {
		const run = (index: number) => {
			const middleware = pluginMiddleware[index];
			if (!middleware) return next();
			middleware(request, response, (error) => {
				if (error) {
					return fail(response, error, "Plugin development request failed.");
				}
				run(index + 1);
			});
		};
		run(0);
	};

	return {
		middleware: (request, response, next) => {
			const pathname = new URL(request.url ?? "/", "http://lucid.local")
				.pathname;
			if (!isAdminPath(pathname)) return runPlugins(request, response, next);

			admin.middleware(request, response, (error: unknown) => {
				if (error) {
					return fail(response, error, "Admin development request failed.");
				}
				next();
			});
		},
		/** Preserves application responses and renders HTML only for missing admin routes. */
		handleResponse: async (request, response) => {
			if (
				response.status !== 404 ||
				!shouldServeAdminShell(new URL(request.url).pathname, request.method)
			) {
				return response;
			}
			await response.body?.cancel();
			return createAdminShellResponse(
				await admin.renderHtml(request.url),
				request.method,
			);
		},
		close,
		pluginData: Object.fromEntries(
			plugins.flatMap((plugin) =>
				plugin.dev.data === undefined ? [] : [[plugin.key, plugin.dev.data]],
			),
		),
	};
};

export default createCliDev;

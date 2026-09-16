import {
	access,
	cp,
	mkdir,
	mkdtemp,
	readFile,
	rename,
	rm,
} from "node:fs/promises";
import path from "node:path";
import {
	build,
	type Connect,
	createLogger,
	createServer,
	type HttpServer,
	type LogLevel,
} from "vite";
import { getAdminBuildKey } from "./cache.js";
import { adminRoot, createAdminConfig } from "./config.js";

type AdminBuildOptions = {
	projectRoot: string;
	outDir: string;
	logLevel?: LogLevel;
};

/** Builds the complete admin application into the host's public output. */
export const buildAdmin = async (options: AdminBuildOptions) => {
	// Match Vite's production default on cache hits as well as fresh builds.
	process.env.NODE_ENV ??= "production";

	const compile = (outDir: string) =>
		build({
			...createAdminConfig(options.projectRoot),
			mode: "production",
			logLevel: options.logLevel ?? "warn",
			build: {
				outDir,
				emptyOutDir: true,
				chunkSizeWarningLimit: Infinity,
			},
		});

	const outDir = path.resolve(options.outDir);

	const key = await getAdminBuildKey(adminRoot, options.projectRoot);
	if (!key) {
		await compile(outDir);
		return;
	}

	const cacheRoot = path.join(options.projectRoot, ".lucid/cache/admin");
	const cached = path.join(cacheRoot, key);

	const exists = await access(path.join(cached, "index.html")).then(
		() => true,
		() => false,
	);
	if (!exists) {
		await mkdir(cacheRoot, { recursive: true });
		const staging = await mkdtemp(path.join(cacheRoot, ".build-"));

		try {
			await compile(staging);
			// Publish only complete builds. Another process may have finished this key first.
			await rename(staging, cached).catch((error: unknown) => {
				if (
					!(error instanceof Error) ||
					!("code" in error) ||
					!["EEXIST", "ENOTEMPTY"].includes(String(error.code))
				)
					throw error;
			});
		} finally {
			await rm(staging, { recursive: true, force: true });
		}
	}

	await rm(outDir, { recursive: true, force: true });
	await cp(cached, outDir, { recursive: true });
};

/** Attaches admin transforms and HMR to an existing host HTTP server. */
export const createAdminDevServer = async (options: {
	projectRoot: string;
	server: HttpServer;
	/** Optional output sink for hosts that buffer startup messages. */
	loggerConsole?: Console;
}) => {
	const vite = await createServer({
		...createAdminConfig(options.projectRoot),
		mode: "development",
		customLogger: options.loggerConsole
			? createLogger("info", {
					allowClearScreen: false,
					console: options.loggerConsole,
				})
			: undefined,
		appType: "custom",
		server: {
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

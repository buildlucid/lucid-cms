import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { relative } from "node:path";
import { getRequestListener } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createCliDev, getBuildPaths } from "@lucidcms/core/build";
import {
	createLucidHost,
	shouldServeAdminShell,
	withResponseCleanup,
} from "@lucidcms/core/runtime";
import type { LucidHonoVariables, ServeHandler } from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";
import getRuntimeContext from "../services/get-runtime-context.js";
import type { AdapterOptions } from "../types.js";

const serveCommand =
	(
		options: AdapterOptions | undefined,
		platformProxy: PlatformProxy | undefined,
	): ServeHandler =>
	async ({
		config,
		env,
		translationStore,
		logger,
		onListening,
		mode,
		pluginData,
		projectRoot,
		configPath,
	}) => {
		logger.instance.info(
			"Using:",
			logger.instance.color.blue("Cloudflare Worker Adapter"),
			{
				silent: logger.silent,
			},
		);
		logger.instance.info("Starting development server...", {
			silent: logger.silent,
		});

		const server = createServer();
		const dev =
			mode === "development"
				? await createCliDev({ server, projectRoot, configPath, config })
				: undefined;

		const runtimeContext = getRuntimeContext({
			server: "cloudflare",
			compiled: false,
			pluginData: dev?.pluginData ?? pluginData,
		});

		const host = await createLucidHost({
			config,
			translationStore,
			runtimeContext: runtimeContext,
			env,
			databaseScope: "runtime",
			http: {
				extensions: [
					{
						name: "runtime-cloudflare:platform-context",
						phase: "beforeMiddleware",
						register: async (app) => {
							app.use("*", async (context, next) => {
								context.set("cf", platformProxy?.cf ?? null);
								context.set(
									"caches",
									(platformProxy?.caches ??
										null) as LucidHonoVariables["caches"],
								);
								context.set(
									"ctx",
									platformProxy?.ctx
										? {
												waitUntil: platformProxy.ctx.waitUntil.bind(
													platformProxy.ctx,
												),
												passThroughOnException:
													platformProxy.ctx.passThroughOnException.bind(
														platformProxy.ctx,
													),
											}
										: null,
								);
								await next();
							});
						},
					},
					{
						name: "runtime-cloudflare:static-assets",
						phase: "afterSetup",
						register: async (app, config) => {
							const paths = getBuildPaths(config);
							const servePublicAssets = serveStatic({
								rewriteRequestPath: (path) => {
									const relativeClientDist = relative(
										process.cwd(),
										paths.publicDist,
									);
									return `${relativeClientDist}${path}`;
								},
							});
							app.use("/*", (c, next) => {
								if (
									mode === "development" &&
									shouldServeAdminShell(c.req.path, c.req.method)
								)
									return next();
								return servePublicAssets(c, next);
							});

							if (mode === "development") return;

							app.get("/admin/*", (c, next) => {
								if (!shouldServeAdminShell(c.req.path, c.req.method))
									return next();
								return c.html(readFileSync(paths.spaDistHtml, "utf-8"));
							});
						},
					},
				],
			},
		}).catch(async (error) => {
			await Promise.allSettled([platformProxy?.dispose(), dev?.close()]);
			throw error;
		});

		for (const issue of host.issues) {
			if (issue.level === "unsupported") {
				logger.instance.error(
					issue.type,
					issue.key,
					"-",
					issue.message ||
						"This is unsupported in your current runtime environment.",
					{
						silent: logger.silent,
					},
				);
			}
			if (issue.level === "notice" && issue.message) {
				logger.instance.warn(issue.type, issue.key, "-", issue.message, {
					silent: logger.silent,
				});
			}
		}
		let destroyRuntimePromise: Promise<void> | undefined;
		const destroyRuntime = () => {
			destroyRuntimePromise ??= Promise.allSettled([
				host.destroy(),
				platformProxy?.dispose(),
			]).then(() => undefined);
			return destroyRuntimePromise;
		};

		let destroyPromise: Promise<void> | undefined;

		const destroy = () => {
			destroyPromise ??= (async () => {
				try {
					await dev?.close();
				} finally {
					try {
						if (server.listening) await server[Symbol.asyncDispose]();
					} finally {
						await destroyRuntime();
					}
				}
			})();
			return destroyPromise;
		};

		try {
			const listener = getRequestListener(async (request, requestBindings) => {
				const invocation = host.createInvocation();

				try {
					const response = await invocation.handle({
						request,
						executionContext: platformProxy?.ctx,
						requestBindings,
					});
					const result = await withResponseCleanup(response, () =>
						invocation.destroy(),
					);
					return dev ? await dev.handleResponse(request, result) : result;
				} catch (error) {
					await invocation.destroy();
					throw error;
				}
			});
			server.on("request", (request, response) => {
				if (!dev) return void listener(request, response);
				dev.middleware(request, response, () => {
					void listener(request, response);
				});
			});

			await new Promise<void>((resolve, reject) => {
				server.once("error", reject);
				server.listen(
					options?.dev?.port ?? 6543,
					options?.dev?.hostname,
					() => {
						server.off("error", reject);
						resolve();
					},
				);
			});

			await onListening({
				address: server.address(),
				adapterKeys: host.adapterKeys,
			});
		} catch (error) {
			await destroy();
			throw error;
		}

		return {
			destroy,
			runtimeContext: runtimeContext,
			adapterKeys: host.adapterKeys,
		};
	};

export default serveCommand;

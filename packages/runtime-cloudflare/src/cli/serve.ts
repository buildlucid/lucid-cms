import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getBuildPaths } from "@lucidcms/core/build";
import { createLucidHost, withResponseCleanup } from "@lucidcms/core/runtime";
import type { LucidHonoVariables, ServeHandler } from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";
import getRuntimeContext from "../services/get-runtime-context.js";
import type { AdapterOptions } from "../types.js";

const serveCommand =
	(
		options: AdapterOptions | undefined,
		platformProxy: PlatformProxy | undefined,
	): ServeHandler =>
	async ({ config, translationStore, logger, onListening }) => {
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

		const runtimeContext = getRuntimeContext({
			server: "cloudflare",
			compiled: false,
		});

		const host = await createLucidHost({
			config,
			translationStore,
			runtimeContext: runtimeContext,
			env: platformProxy?.env,
			databaseScope: "runtime",
			http: {
				extensions: [
					{
						name: "runtime-cloudflare:platform-context",
						priority: 0,
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
						priority: 2,
						register: async (app, config) => {
							const paths = getBuildPaths(config);
							app.use(
								"/*",
								serveStatic({
									rewriteRequestPath: (path) => {
										const relativeClientDist = relative(
											process.cwd(),
											paths.publicDist,
										);
										return `${relativeClientDist}${path}`;
									},
								}),
							);
							app.get("/lucid", (c) => {
								const html = readFileSync(paths.spaDistHtml, "utf-8");
								return c.html(html);
							});
							app.get("/lucid/*", (c) => {
								const html = readFileSync(paths.spaDistHtml, "utf-8");
								return c.html(html);
							});
						},
					},
				],
			},
		}).catch(async (error) => {
			await Promise.allSettled([platformProxy?.dispose()]);
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
		let destroyPromise: Promise<void> | undefined;
		const destroyRuntime = () => {
			destroyPromise ??= Promise.allSettled([
				host.destroy(),
				platformProxy?.dispose(),
			]).then(() => undefined);
			return destroyPromise;
		};

		let server: ReturnType<typeof serve>;
		try {
			server = serve({
				fetch: async (request, requestBindings) => {
					const invocation = host.createInvocation({
						env: platformProxy?.env,
					});
					try {
						const response = await invocation.handle({
							request,
							executionContext: platformProxy?.ctx,
							requestBindings,
						});
						return withResponseCleanup(response, () => invocation.destroy());
					} catch (error) {
						await invocation.destroy();
						throw error;
					}
				},
				port: options?.dev?.port ?? 6543,
				hostname: options?.dev?.hostname,
			});
		} catch (error) {
			await destroyRuntime();
			throw error;
		}

		server.on("listening", () => {
			const address = server.address();
			onListening({
				address: address,
			});
		});
		server.on("close", () => {
			logger.instance.info(
				"Shutting down Cloudflare Worker Adapter development server...",
				{
					spaceBefore: true,
					silent: logger.silent,
				},
			);
			void destroyRuntime();
		});

		let serverDestroyPromise: Promise<void> | undefined;
		return {
			destroy: () => {
				serverDestroyPromise ??= (async () => {
					try {
						if (server.listening) {
							await new Promise<void>((resolve, reject) => {
								server.close((error) => {
									if (error) reject(error);
									else resolve();
								});
							});
						}
					} finally {
						await destroyRuntime();
					}
				})();
				return serverDestroyPromise;
			},
			runtimeContext: runtimeContext,
		};
	};

export default serveCommand;

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import lucid from "@lucidcms/core";
import { getBuildPaths } from "@lucidcms/core/helpers";
import type { LucidHonoGeneric, ServeHandler } from "@lucidcms/core/types";
import { Hono } from "hono";
import type { PlatformProxy } from "wrangler";
import getRuntimeContext from "../runtime-context.js";
import type { AdapterOptions } from "../types.js";

const serveCommand =
	(
		options: AdapterOptions | undefined,
		platformProxy: PlatformProxy | undefined,
	): ServeHandler =>
	async ({ config, logger, onListening }) => {
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

		const cloudflareApp = new Hono<LucidHonoGeneric>();

		cloudflareApp.use("*", async (c, next) => {
			// @ts-expect-error
			c.env = Object.assign(c.env, platformProxy.env);

			// TODO: get these typed
			// @ts-expect-error
			c.set("cf", platformProxy.cf);
			// @ts-expect-error
			c.set("caches", platformProxy.caches);
			// @ts-expect-error
			c.set("ctx", {
				waitUntil: platformProxy?.ctx.waitUntil,
				passThroughOnException: platformProxy?.ctx.passThroughOnException,
			});
			await next();
		});

		const runtimeContext = getRuntimeContext({
			server: "cloudflare",
			compiled: false,
		});

		const { app, destroy, issues } = await lucid.createApp({
			config,
			runtimeContext: runtimeContext,
			env: platformProxy?.env,
			app: cloudflareApp,
			hono: {
				routes: [
					async (app, config) => {
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
				],
			},
		});

		for (const issue of issues) {
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
		const server = serve({
			fetch: app.fetch,
			port: options?.server?.port ?? 6543,
			hostname: options?.server?.hostname,
		});

		server.on("listening", () => {
			const address = server.address();
			onListening({
				address: address,
			});
		});
		server.on("close", async () => {
			logger.instance.info(
				"Shutting down Cloudflare Worker Adapter development server...",
				{
					spaceBefore: true,
					silent: logger.silent,
				},
			);
			await destroy?.();
			await platformProxy?.dispose();
		});

		return {
			destroy: async () => {
				return new Promise<void>((resolve, reject) => {
					server.close((error) => {
						if (error) {
							reject(error);
						} else {
							resolve();
						}
					});
				});
			},
			runtimeContext: runtimeContext,
		};
	};

export default serveCommand;

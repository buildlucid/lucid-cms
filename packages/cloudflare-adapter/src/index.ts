import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { build } from "rolldown";
import lucid from "@lucidcms/core";
import { getVitePaths, stripAdapterCLIPlugin } from "@lucidcms/core/helpers";
import { stat, writeFile, unlink } from "node:fs/promises";
import { getPlatformProxy, type GetPlatformProxyOptions } from "wrangler";
import type {
	LucidAdapterResponse,
	LucidHonoGeneric,
} from "@lucidcms/core/types";
import { serveStatic } from "@hono/node-server/serve-static";
import { relative } from "node:path";

const cloudflareAdapter = (options?: {
	platformProxy?: GetPlatformProxyOptions & { enabled?: boolean };
}): LucidAdapterResponse => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		runtime: {
			middleware: {
				// afterMiddleware: [
				// 	async (app) => {
				// 		app.get("/admin", async (c) => {
				// 			const url = new URL(c.req.url);
				// 			const indexRequest = new Request(
				// 				`${url.origin}/admin/index.html`,
				// 			);
				// 			// @ts-expect-error
				// 			return c.env.ASSETS.fetch(indexRequest);
				// 		});
				// 		app.get("/admin/*", async (c) => {
				// 			// Try to serve the exact asset first
				// 			// @ts-expect-error
				// 			const asset = await c.env.ASSETS.fetch(c.req.raw);
				// 			if (asset.status < 400) {
				// 				return asset;
				// 			}
				// 			// If asset not found, serve index.html for SPA routing
				// 			const url = new URL(c.req.url);
				// 			const indexRequest = new Request(
				// 				`${url.origin}/admin/index.html`,
				// 			);
				// 			// @ts-expect-error
				// 			return c.env.ASSETS.fetch(indexRequest);
				// 		});
				// 	},
				// ],
			},
		},
		cli: {
			serve: async (config) => {
				const cloudflareApp = new Hono<LucidHonoGeneric>();

				if (options?.platformProxy?.enabled !== false) {
					const platformProxy = await getPlatformProxy(options?.platformProxy);

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
							waitUntil: platformProxy.ctx.waitUntil,
							passThroughOnException: platformProxy.ctx.passThroughOnException,
						});
						await next();
					});
				}

				const app = await lucid.createApp({
					config,
					app: cloudflareApp,
					middleware: {
						afterMiddleware: [
							// Add static file serving for dev mode only
							async (app) => {
								const paths = getVitePaths(config);
								app.use(
									"/admin/*",
									serveStatic({
										rewriteRequestPath: (path) => {
											const relativePath = path.replace(/^\/admin/, "");
											const relativeClientDist = relative(
												process.cwd(),
												paths.clientDist,
											);
											return `${relativeClientDist}${relativePath}`;
										},
									}),
								);
							},
						],
					},
				});

				const server = serve({
					fetch: app.fetch,
					port: 8080,
				});

				server.on("listening", () => {
					console.log("Server is running at http://localhost:8080");
				});

				return async () => {
					server.close();
					console.log("Server closed");
				};
			},
			build: async (_, options) => {
				const entryOutput = `${options.outputPath}/${constants.ENTRY_FILE}`;

				//* create the temp entry file
				const configIsTs = options.configPath.endsWith(".ts");
				const tempEntryFile = `${options.outputPath}/temp-entry.${configIsTs ? "ts" : "js"}`;
				const entry = `
import config from "${options.configPath}";
import lucid from "@lucidcms/core";
import { url } from "node:inspector";

const app = await lucid.createApp({
    config: await config,
    middleware: {
        afterMiddleware: [
            async (app) => {
                app.get("/admin", async (c) => {
                    const url = new URL(c.req.url);
                    const requestUrl = url.origin + '/admin/index.html';
                    const indexRequest = new Request(requestUrl);
                    return c.env.ASSETS.fetch(indexRequest);
                });

                app.get("/admin/*", async (c) => {
                    const asset = await c.env.ASSETS.fetch(c.req.raw);

                    if (asset.status < 400) {
                        return asset;
                    }

                    const url = new URL(c.req.url);
                    const requestUrl = url.origin + '/admin/index.html';
                    const indexRequest = new Request(requestUrl);
                    return c.env.ASSETS.fetch(indexRequest);
                });
            },
        ],
    }
});

export default app;`;

				await writeFile(tempEntryFile, entry);

				//* build the entry file
				await build({
					input: tempEntryFile,
					output: {
						file: entryOutput,
						format: "esm",
						minify: true,
						inlineDynamicImports: true,
					},
					treeshake: true,
					platform: "node",
					plugins: [
						stripAdapterCLIPlugin("cloudflare-adapter", [
							"wrangler",
							"@hono/node-server",
							"@hono/node-server/serve-static",
							"rolldown",
						]),
					],
				});

				//* clean up temporary files
				await unlink(tempEntryFile);

				const outputSize = await stat(entryOutput);
				console.log(
					`Single bundle file size: ${(outputSize.size / 1024 / 1024).toFixed(2)}MB`,
				);
			},
		},
	};
};

export default cloudflareAdapter;

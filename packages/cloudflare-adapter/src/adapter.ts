import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { build } from "rolldown";
import lucid from "@lucidcms/core";
import {
	getVitePaths,
	stripImportsPlugin,
	stripAdapterExportPlugin,
} from "@lucidcms/core/helpers";
import { stat, writeFile, unlink } from "node:fs/promises";
import {
	getPlatformProxy,
	type GetPlatformProxyOptions,
	type PlatformProxy,
} from "wrangler";
import type { LucidAdapter, LucidHonoGeneric } from "@lucidcms/core/types";
import { serveStatic } from "@hono/node-server/serve-static";
import { relative } from "node:path";
import { readFileSync } from "node:fs";

const cloudflareAdapter = (options?: {
	platformProxy?: GetPlatformProxyOptions & { enabled?: boolean };
}): LucidAdapter => {
	let platformProxy: PlatformProxy | undefined;

	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		getEnvVars: async () => {
			if (options?.platformProxy?.enabled) {
				platformProxy = await getPlatformProxy(options?.platformProxy);
				return platformProxy.env as Record<string, string>;
			}
			return process.env as Record<string, string>;
		},
		cli: {
			serve: async (config) => {
				const cloudflareApp = new Hono<LucidHonoGeneric>();

				if (options?.platformProxy?.enabled !== false) {
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
				}

				const app = await lucid.createApp({
					config,
					app: cloudflareApp,
					middleware: {
						afterMiddleware: [
							async (app) => {
								const paths = getVitePaths(config);
								app.use(
									"/admin/assets/*",
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
								app.get("/admin", (c) => {
									const html = readFileSync(paths.clientDistHtml, "utf-8");
									return c.html(html);
								});
								app.get("/admin/*", (c) => {
									const html = readFileSync(paths.clientDistHtml, "utf-8");
									return c.html(html);
								});
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

				const relativePath = relative(options.outputPath, options.configPath);
				const importPath = relativePath.replace(/\.ts$/, ".js");

				const configIsTs = options.configPath.endsWith(".ts");
				const tempEntryFile = `${options.outputPath}/temp-entry.${configIsTs ? "ts" : "js"}`;

				const entry = /* ts */ `
import config from "./${importPath}";
import lucid from "@lucidcms/core";
import { processConfig } from "@lucidcms/core/helpers";

export default {
    async fetch(request, env, ctx) {
        const resolved = await processConfig(config(env));

        const app = await lucid.createApp({
            config: resolved,
            middleware: {
                beforeMiddleware: [
                    async (app) => {
                        app.use("*", async (c, next) => {
                            c.env = Object.assign(c.env, env);
                            c.set("cf", env.cf);
                            c.set("caches", env.caches);
                            c.set("ctx", {
                                waitUntil: ctx.waitUntil,
                                passThroughOnException: ctx.passThroughOnException,
                            });
                            await next();
                        })
                    }
                ],
                afterMiddleware: [
                    async (app) => {
                        app.get("/admin", async (c) => {
                            const url = new URL(c.req.url);
                            const requestUrl = url.origin + "/index.html";
                            const indexRequest = new Request(requestUrl);
                            const asset = await c.env.ASSETS.fetch(indexRequest);
                            return new Response(asset.body, {
                                status: asset.status,
                                headers: asset.headers,
                            });
                        });
                        app.get("/admin/*", async (c) => {
                            const url = new URL(c.req.url);
                            const assetPath = url.pathname.replace("/admin", "");
                            const requestUrl = url.origin + assetPath;
                            const assetRequest = new Request(requestUrl);
                            const asset = await c.env.ASSETS.fetch(assetRequest);
                            if (asset.status < 400) {
                                return new Response(asset.body, {
                                    status: asset.status,
                                    headers: asset.headers,
                                });
                            }
                            const indexRequestUrl = url.origin + "/index.html";
                            const indexRequest = new Request(indexRequestUrl);
                            const indexAsset = await c.env.ASSETS.fetch(indexRequest);
                            return new Response(indexAsset.body, {
                                status: indexAsset.status,
                                headers: indexAsset.headers,
                            });
                        });
                    },
                ],
            }
        });

        return app.fetch(request, env, ctx);
    }
};`;

				await writeFile(tempEntryFile, entry);

				//* build the entry file
				await build({
					input: tempEntryFile,
					output: {
						file: entryOutput,
						format: "esm",
						// minify: true,
						inlineDynamicImports: true,
					},
					treeshake: true,
					platform: "node",
					plugins: [
						{
							name: "import-meta-polyfill",
							renderChunk(code: string) {
								return code.replace(
									/import\.meta\.url/g,
									'"file:///server.js"',
								);
							},
						},
						stripAdapterExportPlugin("cloudflareAdapter"),
						stripImportsPlugin("cloudflare-adapter", [
							"wrangler",
							"@hono/node-server",
							"@hono/node-server/serve-static",
							"rolldown",
						]),
					],
					external: ["sharp", "ws"],
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

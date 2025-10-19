import { readFileSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import lucid from "@lucidcms/core";
import {
	getBuildPaths,
	stripAdapterExportPlugin,
	stripImportsPlugin,
} from "@lucidcms/core/helpers";
import type { LucidHonoGeneric, RuntimeAdapter } from "@lucidcms/core/types";
import { Hono } from "hono";
import { build } from "rolldown";
import {
	type GetPlatformProxyOptions,
	getPlatformProxy,
	type PlatformProxy,
} from "wrangler";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import runtimeContext from "./runtime-context.js";

const cloudflareAdapter = (options?: {
	platformProxy?: GetPlatformProxyOptions;
	server?: {
		port?: number;
		hostname?: string;
	};
}): RuntimeAdapter => {
	let platformProxy: PlatformProxy | undefined;

	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		getEnvVars: async () => {
			platformProxy = await getPlatformProxy(options?.platformProxy);
			return platformProxy.env;
		},
		cli: {
			serve: async ({ config, logger, onListening }) => {
				logger.serverStarting("Cloudflare");

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

				const { app, destroy, issues } = await lucid.createApp({
					config,
					runtimeContext: runtimeContext({
						dev: true,
					}),
					env: platformProxy?.env,
					app: cloudflareApp,
					hono: {
						extensions: [
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

				logger.issueGroup(issues);

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
					await destroy?.();
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
				};
			},
			build: async ({ options, logger }) => {
				logger.info("Using:", logger.color.blue("Cloudflare Worker Adapter"));

				try {
					const entryOutput = `${options.outputPath}/${constants.ENTRY_FILE}`;

					const relativePath = relative(options.outputPath, options.configPath);
					const importPath = relativePath.replace(/\.ts$/, ".js");

					const configIsTs = options.configPath.endsWith(".ts");
					const tempEntryFile = `${options.outputPath}/temp-entry.${configIsTs ? "ts" : "js"}`;

					const entry = /* ts */ `
import config from "./${importPath}";
import lucid, { passthroughKVAdapter } from "@lucidcms/core";
import { processConfig } from "@lucidcms/core/helpers";
import emailTemplates from "./email-templates.json" with { type: "json" };
import { runtimeContext } from "@lucidcms/cloudflare-adapter";

export default {
	async fetch(request, env, ctx) {
		const resolved = await processConfig(
			config(env, {
				emailTemplates: emailTemplates,
			}),
		);

		const { app } = await lucid.createApp({
			config: resolved,
			env: env,
			runtimeContext: runtimeContext({
				dev: false,
			}),
			hono: {
				middleware: [
					async (app, config) => {
						app.use("*", async (c, next) => {
							c.env = Object.assign(c.env, env);
							c.set("cf", env.cf);
							c.set("caches", env.caches);
							c.set("ctx", {
								waitUntil: ctx.waitUntil,
								passThroughOnException: ctx.passThroughOnException,
							});
							await next();
						});
					},
				],
				extensions: [
					async (app, config) => {
						app.get("/admin/*", async (c) => {
							const url = new URL(c.req.url);

							const indexRequestUrl = url.origin + "/admin/index.html";
							const indexRequest = new Request(indexRequestUrl);
							const indexAsset = await c.env.ASSETS.fetch(indexRequest);
							return new Response(indexAsset.body, {
								status: indexAsset.status,
								headers: indexAsset.headers,
							});
						});
					},
				],
			},
		});

		return app.fetch(request, env, ctx);
	},
	async scheduled(controller, env, ctx) {
		const runCronService = async () => {
			const resolved = await processConfig(config(env));
			const kv = await (resolved.kv ? resolved.kv() : passthroughKVAdapter());

			const cronJobSetup = await lucid.setupCronJobs({
				createQueue: true,
			});
			await cronJobSetup.register({
				config: resolved,
				db: resolved.db.client,
				queue: cronJobSetup.queue,
				env: env,
				kv: kv,
			});
		};

		ctx.waitUntil(runCronService());
	},
};`;

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
						external: ["sharp", "ws", "better-sqlite3", "file-type"],
					});

					//* clean up temporary files
					await unlink(tempEntryFile);
				} catch (error) {
					logger.error(
						error instanceof Error
							? error.message
							: "An error occured building via the Cloudflare Worker Adapter",
					);
					throw error;
				}
			},
		},
	};
};

export default cloudflareAdapter;

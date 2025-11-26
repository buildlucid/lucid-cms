import { readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
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
import {
	type GetPlatformProxyOptions,
	getPlatformProxy,
	type PlatformProxy,
} from "wrangler";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import getRuntimeContext from "./runtime-context.js";
import prepareMainWorkerEntry from "./services/prepare-worker-entry.js";
import prepareAdditionalWorkerEntries from "./services/prepare-additional-worker-entries.js";
import writeWorkerEntries from "./services/write-worker-entries.js";
import { build } from "rolldown";

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
		config: {
			customBuildArtifacts: [
				constants.WORKER_EXPORT_ARTIFACT_TYPE,
				constants.WORKER_ENTRY_ARTIFACT_TYPE,
			],
		},
		getEnvVars: async ({ logger }) => {
			if (options?.platformProxy?.environment) {
				logger.instance.info(
					"Loading Cloudflare bindings from the",
					logger.instance.color.blue(options?.platformProxy?.environment),
					"environment",
					{
						silent: logger.silent,
					},
				);
			} else {
				logger.instance.info(
					"Loading Cloudflare bindings from wrangler default configuration. If using env-specific bindings (KV, Queues), configure via platformProxy.environment option.",
					{
						silent: logger.silent,
					},
				);
			}
			platformProxy = await getPlatformProxy(options?.platformProxy);
			return platformProxy.env;
		},
		cli: {
			serve: async ({ config, logger, onListening }) => {
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
			},
			build: async ({
				configPath,
				outputPath,
				outputRelativeConfigPath,
				buildArtifacts,
				logger,
			}) => {
				logger.instance.info(
					"Using:",
					logger.instance.color.blue("Cloudflare Worker Adapter"),
					{
						silent: logger.silent,
					},
				);

				try {
					const configIsTs = configPath.endsWith(".ts");
					const extension = configIsTs ? "ts" : "js";

					const mainWorkerEntry = prepareMainWorkerEntry(
						outputRelativeConfigPath,
						buildArtifacts.custom,
					);
					const additionalWorkerEntries = prepareAdditionalWorkerEntries(
						buildArtifacts.custom,
					);

					const allEntries = [
						{
							key: constants.ENTRY_FILE,
							filepath: `${outputPath}/temp-entry.${extension}`,
							...mainWorkerEntry,
						},
						...additionalWorkerEntries.map((entry) => ({
							...entry,
							filepath: `${outputPath}/${entry.key}.${extension}`,
						})),
					];

					const tempFiles = await writeWorkerEntries(allEntries);

					//* build files
					await Promise.all(
						Object.entries({
							...allEntries.reduce<Record<string, string>>((acc, entry) => {
								acc[entry.key] = entry.filepath;
								return acc;
							}, {}),
							...buildArtifacts.compile,
						}).map(([key, inputPath]) =>
							build({
								input: { [key]: inputPath },
								output: {
									dir: outputPath,
									format: "esm" as const,
									minify: true,
									inlineDynamicImports: true,
								},
								treeshake: true,
								platform: "node" as const,
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
							}),
						),
					);

					//* cleanup temp files
					await Promise.all(
						[...tempFiles, ...Object.values(buildArtifacts.compile)].map(
							(file) => unlink(file),
						),
					);

					return {
						runtimeContext: getRuntimeContext({
							server: "cloudflare",
							compiled: true,
						}),
					};
				} catch (error) {
					logger.instance.error(
						error instanceof Error
							? error.message
							: "An error occurred building via the Cloudflare Worker Adapter",
						{
							silent: logger.silent,
						},
					);
					throw error;
				}
			},
		},
	};
};

export default cloudflareAdapter;

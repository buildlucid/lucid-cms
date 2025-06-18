import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { build } from "rolldown";
import lucid from "@lucidcms/core";
import { stat, writeFile, unlink } from "node:fs/promises";
import { getPlatformProxy, type GetPlatformProxyOptions } from "wrangler";
import type {
	LucidAdapterResponse,
	LucidHonoGeneric,
} from "@lucidcms/core/types";

const cloudflareAdapter = (options: {
	platformProxy?: GetPlatformProxyOptions & { enabled?: boolean };
}): LucidAdapterResponse => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		handlers: {
			serve: async (config) => {
				const app = await lucid.createApp({
					config,
					beforeMiddleware: async (app) => {
						if (options?.platformProxy?.enabled !== false) {
							const platformProxy = await getPlatformProxy(
								options?.platformProxy,
							);

							app.use("*", async (c, next) => {
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
									passThroughOnException:
										platformProxy.ctx.passThroughOnException,
								});
								await next();
							});
						}
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
				const configOutput = `${options.outputPath}/${constants.CONFIG_FILE}`;
				const entryOutput = `${options.outputPath}/${constants.ENTRY_FILE}`;

				await build({
					input: options.configPath,
					output: {
						file: configOutput,
						format: "esm",
						minify: true,
						inlineDynamicImports: true,
					},
					treeshake: true,
					platform: "node",
					// TODO: temp to get the bundle down, these will both be replace/have workarounds
					external: ["argon2", "mjml"],
				});

				//* create the temp entry file
				const tempEntryFile = `${options.outputPath}/temp-entry.js`;
				const entry = `
import config from "./${constants.CONFIG_FILE}";
import lucid from "@lucidcms/core";

const app = await lucid.createApp({
    config: await config,
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
					// TODO: temp to get the bundle down, these will both be replace/have workarounds
					external: ["argon2", "mjml"],
				});
				//* clean up temporary files
				await Promise.all([unlink(configOutput), unlink(tempEntryFile)]);

				const outputSize = await stat(entryOutput);
				console.log(
					`Single bundle file size: ${(outputSize.size / 1024 / 1024).toFixed(2)}MB`,
				);
			},
		},
	};
};

export default cloudflareAdapter;

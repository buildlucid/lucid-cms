import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import { serve } from "@hono/node-server";
import lucid from "@lucidcms/core";
import {
	stripImportsPlugin,
	stripAdapterExportPlugin,
} from "@lucidcms/core/helpers";
import { build } from "rolldown";
import { writeFile } from "node:fs/promises";
import type { LucidAdapter } from "@lucidcms/core/types";

const nodeAdapter = (options?: {
	server?: {
		port?: number;
		hostname?: string;
	};
}): LucidAdapter => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		getEnvVars: async () => {
			try {
				const { config } = await import("dotenv");
				config();
			} catch {}

			return process.env as Record<string, unknown>;
		},
		cli: {
			serve: async (config, logger) => {
				const startTime = process.hrtime();
				logger.serverStarting("Node");

				const app = await lucid.createApp({ config });

				const server = serve({
					fetch: app.fetch,
					port: options?.server?.port ?? 5432,
					hostname: options?.server?.hostname,
				});

				server.on("listening", () => {
					const address = server.address();
					logger.serverStarted(address, startTime);
				});

				return async () => {
					server.close();
				};
			},
			build: async (_, options, logger) => {
				const startTime = logger.appBuildStart("Node");

				const configOutput = `${options.outputPath}/${constants.CONFIG_FILE}`;
				const entryOutput = `${options.outputPath}/${constants.ENTRY_FILE}`;

				try {
					await build({
						input: options.configPath,
						output: {
							file: configOutput,
							format: "esm",
							minify: true,
							inlineDynamicImports: true,
						},
						plugins: [
							stripAdapterExportPlugin("nodeAdapter"),
							stripImportsPlugin("node-adapter", ["rolldown"]),
							// 	{
							// 		name: "bundle-analyzer",
							// 		generateBundle(options, bundle) {
							// 			for (const [fileName, chunk] of Object.entries(bundle)) {
							// 				if (chunk.type === "chunk") {
							// 					console.log(`\n📦 Bundle: ${fileName}`);
							// 					console.log(
							// 						`📏 Size: ${(chunk.code.length / 1024 / 1024).toFixed(2)}MB`,
							// 					);

							// 					const modules = chunk.modules || {};
							// 					const sortedModules = Object.entries(modules)
							// 						.map(([id, module]) => ({
							// 							id,
							// 							size: module.code?.length || 0,
							// 						}))
							// 						.sort((a, b) => b.size - a.size)
							// 						.slice(0, 20);
							// 					console.log("\n📋 Largest bundled modules:");
							// 					for (const { id, size } of sortedModules) {
							// 						console.log(`  ${(size / 1024).toFixed(1)}KB - ${id}`);
							// 					}
							// 				}
							// 			}
							// 		},
							// 	},
							// 	{
							// 		name: "import-tracer",
							// 		buildStart() {
							// 			this.addWatchFile = () => {}; // Prevent watch issues
							// 		},
							// 		resolveId(id, importer) {
							// 			if (id.includes("typescript") || id.includes("prettier")) {
							// 				console.log(`🔍 ${id}`);
							// 				console.log(`   ← imported by: ${importer || "entry"}`);
							// 				console.log("");
							// 			}
							// 			return null;
							// 		},
							// 	},
						],
						treeshake: true,
						platform: "node",
						external: ["dotenv"],
					});
					// TODO: add support so the port and server options are configurable
					const entry = /* ts */ `
import 'dotenv/config'
import config from "./${constants.CONFIG_FILE}";
import lucid from "@lucidcms/core";
import { processConfig } from "@lucidcms/core/helpers";
import { serve } from '@hono/node-server';
import cron from 'node-cron';

const resolved = await processConfig(config(process.env));

const app = await lucid.createApp({
    config: resolved,
});
const cronJobs = lucid.setupCronJobs({
    config: resolved,
});

const port = Number.parseInt(process.env.PORT || '5432', 10);
const hostname = process.env.HOST || process.env.HOSTNAME;

const server = serve({
    fetch: app.fetch,
    port,
    hostname,
});

cron.schedule(cronJobs.schedule, async () => {
    await cronJobs.register();
});

server.on("listening", () => {
    console.log("Server is running at http://localhost:5432");
});

process.on("SIGINT", () => {
    server.close()
    process.exit(0)
})
process.on("SIGTERM", () => {
    server.close((err) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    process.exit(0)
    })
})`;

					await writeFile(entryOutput, entry);

					logger.appBuildComplete(startTime);
				} catch (error) {
					logger.buildFailed(error);
					throw error;
				}
			},
		},
	};
};

export default nodeAdapter;

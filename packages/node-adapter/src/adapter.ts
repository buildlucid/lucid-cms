import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import { serve } from "@hono/node-server";
import lucid from "@lucidcms/core";
import {
	stripImportsPlugin,
	stripAdapterExportPlugin,
} from "@lucidcms/core/helpers";
import { build } from "rolldown";
import { stat, writeFile } from "node:fs/promises";
import type { LucidAdapter } from "@lucidcms/core/types";

const nodeAdapter = (): LucidAdapter => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		getEnvVars: async () => {
			return process.env as Record<string, string>;
		},
		cli: {
			serve: async (config) => {
				const app = await lucid.createApp({ config });
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
				});

				const entry = /* ts */ `
import config from "./${constants.CONFIG_FILE}";
import lucid from "@lucidcms/core";
import { serve } from '@hono/node-server';

const app = await lucid.createApp({
    config: await config,
});

const server = serve({
    fetch: app.fetch,
    port: 8080,
});

server.on("listening", () => {
    console.log("Server is running at http://localhost:8080");
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

				const [outputSize, configSize] = await Promise.all([
					stat(entryOutput),
					stat(configOutput),
				]);
				console.log(
					`Output file size: ${(outputSize.size / 1024 / 1024).toFixed(2)}MB`,
					`Config file size: ${(configSize.size / 1024 / 1024).toFixed(2)}MB`,
				);
			},
		},
	};
};

export default nodeAdapter;

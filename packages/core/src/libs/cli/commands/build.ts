import { build } from "rolldown";
import { rm, writeFile } from "node:fs/promises";
import getConfigPath from "../../config/get-config-path.js";
import getConfig from "../../config/get-config.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";

/**
 * @todo currently prettier, the typescript compiler and a few other packages are being bundled that we dont want. This is due to MJML it seems.
 *       MJML will likley need precompilling here instead anyway as it isnt supported in certain runtimes.
 * @todo remove the argon2 external dependency after this has been replaced with something else. Argon2 is not supported in
 *       certain runtimes like Cloudflare and potentially Deno?
 */
const buildCommand = async () => {
	await installOptionalDeps();

	const startTime = process.hrtime();

	await rm("dist", { recursive: true, force: true });

	const configPath = getConfigPath(process.cwd());
	const config = await getConfig({ path: configPath });

	const buildResponse = await vite.buildApp(config);
	if (buildResponse.error) {
		console.error(buildResponse.error.message);
		process.exit(1);
	}

	await build({
		input: configPath,
		output: {
			file: "dist/lucid.config.js",
			format: "esm",
			minify: true,
			inlineDynamicImports: true,
		},
		// plugins: [
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
		// ],
		treeshake: true,
		platform: "node",
		// TODO: temp to get the bundle down, these will both be replace/have workarounds
		external: ["argon2", "mjml"],
	});

	// TODO: once adapters are supported, this will live in the adapter
	const entry = `
import config from "./lucid.config.js";
import lucid from "@lucidcms/core";
import { serve } from '@hono/node-server';

const app = await lucid.createApp({
    config: await config,
});

serve({
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
})
    `;

	await writeFile("dist/server.js", entry);

	console.log(`Build completed in ${process.hrtime(startTime)[1] / 1000000}ms`);

	process.exit(0);
};

export default buildCommand;

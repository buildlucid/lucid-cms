import { unlink, writeFile } from "node:fs/promises";
import {
	stripAdapterExportPlugin,
	stripImportsPlugin,
} from "@lucidcms/core/build";
import type { BuildHandler } from "@lucidcms/core/types";
import { build } from "rolldown";
import nodeExternals from "rollup-plugin-node-externals";
import constants from "../constants.js";
import getRuntimeContext from "../services/runtime-context.js";

const buildCommand: BuildHandler = async ({
	configPath,
	outputPath,
	buildArtifacts,
	logger,
}) => {
	logger.instance.info(
		"Using:",
		logger.instance.color.blue("Node Runtime Adapter"),
		{
			silent: logger.silent,
		},
	);

	try {
		const buildInput = {
			[constants.CONFIG_FILE]: configPath,
			...buildArtifacts.compile,
		};

		await build({
			input: buildInput,
			output: {
				dir: outputPath,
				format: "esm",
				minify: true,
				codeSplitting: false,
			},
			plugins: [
				nodeExternals(),
				stripAdapterExportPlugin("adapter"),
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
import config, { envSchema } from "./${constants.CONFIG_FILE}.js";
import { resolveConfigDefinition } from "@lucidcms/core/build";
import { createApp, setupCronJobs } from "@lucidcms/core/runtime";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { getRuntimeContext } from "@lucidcms/node-adapter";

const startServer = async () => {
	try {
		const { config: resolved, env } = await resolveConfigDefinition({
			definition: config,
			envSchema,
			processConfigOptions: {
				skipValidation: true,
			},
		});

		const { app, destroy, queue, kv } = await createApp({
			config: resolved,
			env: env,
			runtimeContext: getRuntimeContext({
                compiled: true,
            }),
		});

		const cronJobSetup = await setupCronJobs({
			createQueue: false,
		});

		const port = Number.parseInt(process.env.PORT || "6543", 10);
		const hostname = process.env.HOST || process.env.HOSTNAME;

		const server = serve({
			fetch: app.fetch,
			port,
			hostname,
		});

		if (cronJobSetup.schedule) {
			cron.schedule(cronJobSetup.schedule, async () => {
				await cronJobSetup.register({
					config: resolved,
					db: { client: resolved.db.client },
					queue: queue,
					env: env,
					kv: kv,
					requestUrl: "http://localhost:" + port,
				});
			}, {
				noOverlap: true,
			});
		}

		server.on("listening", () => {
			const address = server.address();
			if (typeof address === "string") console.log(address);
			else {
				if (address.address === "::")
					console.log("http://localhost:" + address.port);
				else console.log("http://" + address.address + ":" + address.port);
			}
		});
		server.on("close", async () => {
			await destroy?.();
		});

		const gracefulShutdown = (signal) => {
			server.close((error) => {
				if (error) {
					console.error(error);
					process.exit(1);
				} else {
					process.exit(0);
				}
			});
		};

		process.on("SIGINT", () => gracefulShutdown("SIGINT"));
		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

startServer();`;

		const entryOutput = `${outputPath}/${constants.ENTRY_FILE}`;
		await writeFile(entryOutput, entry);

		for (const artifact of Object.values(buildInput)) {
			if (artifact === configPath) continue;
			await unlink(artifact);
		}

		return {
			runtimeContext: getRuntimeContext({
				compiled: true,
			}),
		};
	} catch (error) {
		logger.instance.error(
			error instanceof Error
				? error.message
				: "An error occured building via the Node Adapter",
			{
				silent: logger.silent,
			},
		);
		throw error;
	}
};

export default buildCommand;

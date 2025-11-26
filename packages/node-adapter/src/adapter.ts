import { unlink, writeFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import lucid from "@lucidcms/core";
import {
	stripAdapterExportPlugin,
	stripImportsPlugin,
} from "@lucidcms/core/helpers";
import type { RuntimeAdapter } from "@lucidcms/core/types";
import { build } from "rolldown";
import nodeExternals from "rollup-plugin-node-externals";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import getRuntimeContext from "./runtime-context.js";

const nodeAdapter = (options?: {
	server?: {
		port?: number;
		hostname?: string;
	};
}): RuntimeAdapter => {
	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		getEnvVars: async ({ logger }) => {
			try {
				const { config } = await import("dotenv");
				const result = config();

				if (result.parsed) {
					const envFile = process.env.DOTENV_CONFIG_PATH || ".env";
					logger.instance.info(
						"Loading environment variables from",
						logger.instance.color.blue(envFile),
						"file",
						{
							silent: logger.silent,
						},
					);
				} else if (result.error) {
					logger.instance.warn(
						"No .env file found, using system environment variables",
						{
							silent: logger.silent,
						},
					);
				}
			} catch {
				logger.instance.warn(
					"dotenv not installed, using system environment variables",
					{
						silent: logger.silent,
					},
				);
			}

			return process.env as Record<string, unknown>;
		},
		cli: {
			serve: async ({ config, logger, onListening }) => {
				logger.instance.info(
					"Using:",
					logger.instance.color.blue("Node Runtime Adapter"),
					{
						silent: logger.silent,
					},
				);
				logger.instance.info("Starting development server...", {
					silent: logger.silent,
				});

				const runtimeContext = getRuntimeContext({
					compiled: false,
				});

				const { app, destroy, issues } = await lucid.createApp({
					config,
					runtimeContext: runtimeContext,
					env: process.env,
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
						"Shutting down Node Adapter development server...",
						{
							silent: logger.silent,
							spaceBefore: true,
						},
					);
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
							inlineDynamicImports: true,
						},
						plugins: [
							nodeExternals(),
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
import "dotenv/config";
import config from "./${constants.CONFIG_FILE}";
import lucid from "@lucidcms/core";
import { processConfig } from "@lucidcms/core/helpers";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { getRuntimeContext } from "@lucidcms/node-adapter";

const startServer = async () => {
	try {
		const resolved = await processConfig(config(process.env));

		const { app, destroy, queue, kv } = await lucid.createApp({
			config: resolved,
			env: process.env,
			runtimeContext: getRuntimeContext({
                compiled: true,
            }),
		});

		const cronJobSetup = await lucid.setupCronJobs({
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
					db: resolved.db.client,
					queue: queue,
					env: process.env,
					kv: kv,
				});
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
			},
		},
	};
};

export default nodeAdapter;

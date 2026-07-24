import { unlink, writeFile } from "node:fs/promises";
import {
	configArtifactEntries,
	getConfigArtifactImportPaths,
	prepareConfigArtifacts,
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
		const configArtifacts = await prepareConfigArtifacts({
			configPath,
			outputPath,
		});
		const buildInput = {
			[configArtifactEntries.config]: configArtifacts.config,
			[configArtifactEntries.env]: configArtifacts.env,
			[configArtifactEntries.db]: configArtifacts.db,
			[configArtifactEntries.runtime]: configArtifacts.runtime,
			...buildArtifacts.compile,
		};
		const configArtifactImports = getConfigArtifactImportPaths(".");

		await build({
			input: buildInput,
			output: {
				dir: outputPath,
				format: "esm",
				minify: true,
			},
			plugins: [nodeExternals()],
			treeshake: true,
			platform: "node",
		});

		const entry = /* ts */ `
import configFactory from "${configArtifactImports.config}";
import { env as envSchema } from "${configArtifactImports.env}";
import db from "${configArtifactImports.db}";
import runtime from "${configArtifactImports.runtime}";
import i18nTranslations from "./i18n-translations.json" with { type: "json" };
import { logger } from "@lucidcms/core";
import { createLucidHost, setupCronJobs, withResponseCleanup } from "@lucidcms/core/runtime";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { getRuntimeContext } from "@lucidcms/runtime-node/runtime";

const resolveRuntime = async () => {
	const runtimeValue = typeof runtime === "function" ? runtime() : runtime;
	const runtimeAdapter = await runtimeValue;

	if (!runtimeAdapter || typeof runtimeAdapter !== "object") {
		throw new Error(
			"Lucid Node runtime could not resolve the configured runtime adapter.",
		);
	}

	return runtimeAdapter;
};

const startServer = async () => {
	let destroyRuntime = async () => undefined;
	try {
		const runtimeAdapter = await resolveRuntime();
		const definition = {
			runtime: runtimeAdapter,
			db,
			config: configFactory,
		};
		const runtimeContext = getRuntimeContext({
			compiled: true,
		});
		const host = await createLucidHost({
			definition,
			envSchema,
			runtimeContext,
			translationBundles: i18nTranslations,
			databaseScope: "runtime",
		});
		const env = host.env;
		const resolved = host.config;
		let destroyPromise;
		const cronTasks = [];
		const activeCronJobs = new Set();
		destroyRuntime = () => {
			destroyPromise ||= (async () => {
				await Promise.allSettled(cronTasks.map((task) => task.destroy()));
				await Promise.allSettled(activeCronJobs);
				await host.destroy();
			})();
			return destroyPromise;
		};

		const cronJobSetup = await setupCronJobs({
			createQueue: false,
		});

		const runtimeOptions = runtimeAdapter.getOptions?.();
		const port =
			runtimeOptions?.server?.port ??
			Number.parseInt(process.env.PORT || "6543", 10);
		const hostname =
			runtimeOptions?.server?.hostname ?? process.env.HOST ?? process.env.HOSTNAME;

		const server = serve({
			fetch: async (request, requestBindings) => {
				const invocation = host.createInvocation({ env });
				try {
					const response = await invocation.handle({
						request,
						requestBindings,
					});
					return withResponseCleanup(response, () => invocation.destroy());
				} catch (error) {
					await invocation.destroy();
					throw error;
				}
			},
			port,
			hostname,
		});
		for (const schedule of cronJobSetup.schedules) {
			cronTasks.push(
				cron.schedule(schedule, async () => {
					const invocation = host.createInvocation({ env });
					const task = (async () => {
						try {
							await cronJobSetup.register(
								await invocation.getServiceContext({
									url: resolved.host ?? "http://localhost:" + port,
								}),
								{ schedule },
							);
						} finally {
							await invocation.destroy();
						}
					})();
					activeCronJobs.add(task);
					try {
						await task;
					} finally {
						activeCronJobs.delete(task);
					}
				}, {
					noOverlap: true,
				}),
			);
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
		server.on("close", () => {
			void destroyRuntime();
		});

		let shutdownPromise;
		const gracefulShutdown = () => {
			shutdownPromise ??= (async () => {
				let exitCode = 0;
				if (server.listening) {
					await new Promise((resolve) => {
						server.close((error) => {
							if (error) {
								console.error(error);
								exitCode = 1;
							}
							resolve();
						});
					});
				}
				await destroyRuntime();
				process.exit(exitCode);
			})();
			return shutdownPromise;
		};

		process.on("SIGINT", gracefulShutdown);
		process.on("SIGTERM", gracefulShutdown);
	} catch (error) {
		logger.error({
			error,
			event: "runtime-node.startup.failed",
			message: "Failed to start the Node runtime",
			scope: "runtime-node",
		});
		await logger.flush();
		await destroyRuntime();
		process.exit(1);
	}
};

startServer();`;

		const entryOutput = `${outputPath}/${constants.ENTRY_FILE}`;
		await writeFile(entryOutput, entry);

		for (const artifact of [
			...Object.values(configArtifacts),
			...Object.values(buildArtifacts.compile),
		]) {
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

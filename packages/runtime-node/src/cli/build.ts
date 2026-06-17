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
import { createApp, prepareTranslations, processConfig, resolveDatabaseAdapter, setupCronJobs } from "@lucidcms/core/runtime";
import { createTranslator } from "@lucidcms/core/plugin";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { getRuntimeContext } from "@lucidcms/runtime-node/runtime";

const silentLogger = {
	instance: {
		info: () => {},
		warn: () => {},
		error: () => {},
		log: () => {},
		success: () => {},
		color: {
			blue: (value) => String(value),
		},
	},
	silent: true,
};

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
	try {
		const runtimeAdapter = await resolveRuntime();
		const env = runtimeAdapter.getEnvVars
			? await runtimeAdapter.getEnvVars({
					logger: silentLogger,
				})
			: undefined;

		if (envSchema && env) {
			envSchema.parse(env);
		}
		await runtimeAdapter.resolveOptions?.(env || {});

		const definition = {
			runtime: runtimeAdapter,
			db,
			config: configFactory,
		};
		const wrappedDefinition = runtimeAdapter.configureLucid
			? runtimeAdapter.configureLucid(definition)
			: definition;
		const databaseAdapter = await resolveDatabaseAdapter(
			wrappedDefinition.db,
			env,
		);
		const resolved = await processConfig(wrappedDefinition.config(env || {}), {
			recipe: wrappedDefinition.recipe,
			resolvedDb: databaseAdapter,
			skipValidation: true,
		});
		const { translationStore } = await prepareTranslations({
			config: resolved,
			bundles: i18nTranslations,
		});
		const translate = createTranslator({ store: translationStore, locale: "en" });

		const { app, destroy, queue, kv } = await createApp({
			config: resolved,
			translationStore,
			env: env,
			runtimeContext: getRuntimeContext({
                compiled: true,
            }),
		});

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
			fetch: app.fetch,
			port,
			hostname,
		});

		for (const schedule of cronJobSetup.schedules) {
			cron.schedule(schedule, async () => {
				await cronJobSetup.register({
					config: resolved,
					translationStore,
					db: { client: resolved.db.client },
					queue: queue,
					env: env,
					kv: kv,
					request: {
						url: "http://localhost:" + port,
						locale: resolved.i18n.defaultLocale,
					},
					translate,
				}, {
					schedule,
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

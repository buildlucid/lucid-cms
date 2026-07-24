import type { Config, EnvironmentVariables } from "../../../types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import loadConfigFile from "../../config/load-config-file.js";
import type { DatabaseConnection } from "../../db/types.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import cliLogger from "../logger.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import validateEnvVars from "../services/validate-env-vars.js";

const syncCommand = async (options?: {
	skipEnvValidation?: boolean;
	remote?: boolean;
}) => {
	let kvInstance: KVAdapterInstance | undefined;
	let config: Config | undefined;
	let env: EnvironmentVariables | undefined;
	let runtimeContext: AdapterRuntimeContext | undefined;
	let translationStore: TranslationStore | undefined;
	let database: DatabaseConnection | undefined;

	const cleanup = async () => {
		if (!config) return;
		await Promise.allSettled([
			database?.destroy(),
			destroyKVAdapter(kvInstance, { config, env, runtimeContext }),
		]);
		database = undefined;
		kvInstance = undefined;
	};

	try {
		startLoggerBuffering();
		const startTime = cliLogger.startTimer();

		const res = await loadConfigFile({
			prepareRuntime: true,
		});
		config = res.config;
		env = res.env;
		runtimeContext = res.runtimeContext;
		translationStore = (
			await prepareTranslations({
				config,
				projectRoot: res.projectRoot,
			})
		).translationStore;

		if (options?.skipEnvValidation !== true) {
			const envValid = await validateEnvVars({
				envSchema: res.envSchema,
				env: res.env,
			});

			if (!envValid) {
				await stopLoggerBuffering();
				process.exit(1);
			}
		}

		kvInstance = await getInitializedKVAdapter(config, {
			env,
			runtimeContext,
		});
		database = await config.db.connect(env);

		const syncResult = await runSyncTasks({
			config,
			database,
			translationStore,
			kv: kvInstance,
			env,
			runtimeContext,
		});
		if (!syncResult) {
			await cleanup();
			await stopLoggerBuffering();
			process.exit(1);
		}

		cliLogger.info("Clearing KV cache...");
		await kvInstance.clear(
			createServiceContext({
				config,
				database,
				translationStore,
				env,
				runtimeContext,
				kv: kvInstance,
			}),
		);
		await cleanup();

		const endTime = startTime();
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			"Sync completed",
			cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{
				spaceAfter: true,
				spaceBefore: true,
			},
		);

		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		await cleanup();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Sync failed");
		} else {
			cliLogger.error("Sync failed", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default syncCommand;

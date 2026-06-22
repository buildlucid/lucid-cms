import type { Config, EnvironmentVariables } from "../../../types.js";
import loadConfigFile from "../../config/load-config-file.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import { createToolkitServiceContext } from "../../toolkit/config.js";
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
	try {
		logger.setBuffering(true);
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
				logger.setBuffering(false);
				process.exit(1);
			}
		}

		kvInstance = await getInitializedKVAdapter(config, {
			env,
			runtimeContext,
		});

		const syncResult = await runSyncTasks(
			config,
			translationStore,
			"process",
			kvInstance,
			env,
			runtimeContext,
		);
		if (!syncResult) {
			await destroyKVAdapter(kvInstance, { config, env, runtimeContext });
			logger.setBuffering(false);
			process.exit(1);
		}

		cliLogger.info("Clearing KV cache...");
		await kvInstance.clear(
			createToolkitServiceContext({
				config,
				translationStore,
				env,
				runtimeContext,
				kv: kvInstance,
			}),
		);
		await destroyKVAdapter(kvInstance, { config, env, runtimeContext });
		kvInstance = undefined;

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

		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		if (config && translationStore) {
			await destroyKVAdapter(kvInstance, { config, env, runtimeContext });
		}
		cliLogger.error(
			"Sync failed",
			error instanceof Error ? error.message : "Unknown error",
		);
		if (error instanceof Error) cliLogger.errorInstance(error);
		logger.setBuffering(false);
		process.exit(1);
	}
};

export default syncCommand;

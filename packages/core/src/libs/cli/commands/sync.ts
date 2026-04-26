import loadConfigFile from "../../config/load-config-file.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import cliLogger from "../logger.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import validateEnvVars from "../services/validate-env-vars.js";

const syncCommand = async (options?: { skipEnvValidation?: boolean }) => {
	let kvInstance: KVAdapterInstance | undefined;
	try {
		logger.setBuffering(true);
		const startTime = cliLogger.startTimer();

		const res = await loadConfigFile();
		const config = res.config;

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

		kvInstance = await getInitializedKVAdapter(config);

		const syncResult = await runSyncTasks(config, "process", kvInstance);
		if (!syncResult) {
			await destroyKVAdapter(kvInstance);
			logger.setBuffering(false);
			process.exit(1);
		}

		cliLogger.info("Clearing KV cache...");
		await kvInstance.clear();
		await destroyKVAdapter(kvInstance);
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
		await destroyKVAdapter(kvInstance);
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

import { syncServices } from "../../../services/index.js";
import type { Config } from "../../../types.js";
import getKVAdapter from "../../kv-adapter/get-adapter.js";
import type { KVAdapterInstance } from "../../kv-adapter/types.js";
import logger from "../../logger/index.js";
import passthroughQueueAdapter from "../../queue-adapter/adapters/passthrough.js";
import cliLogger from "../logger.js";

const runSyncTasks = async (
	config: Config,
	mode: "process" | "return",
	kvInstance?: KVAdapterInstance,
): Promise<boolean> => {
	cliLogger.info("Running sync tasks...");

	const kv = kvInstance ?? (await getKVAdapter(config));
	const queue = passthroughQueueAdapter();

	const [localesResult, collectionsResult] = await Promise.all([
		syncServices.syncLocales({
			db: { client: config.db.client },
			config: config,
			queue: queue,
			env: null,
			kv: kv,
			requestUrl: config.baseUrl ?? "",
		}),
		syncServices.syncCollections({
			db: { client: config.db.client },
			config: config,
			queue: queue,
			env: null,
			kv: kv,
			requestUrl: config.baseUrl ?? "",
		}),
	]);

	if (localesResult.error) {
		cliLogger.error(
			"Sync failed during locale sync, with error:",
			localesResult.error.message || "unknown",
		);
		if (mode === "process") {
			logger.setBuffering(false);
			process.exit(1);
		} else return false;
	}
	if (collectionsResult.error) {
		cliLogger.error(
			"Sync failed during collections sync, with error:",
			collectionsResult.error.message || "unknown",
		);
		if (mode === "process") {
			logger.setBuffering(false);
			process.exit(1);
		} else return false;
	}

	cliLogger.success(
		"Sync tasks completed",
		cliLogger.color.green("successfully"),
	);
	return true;
};

export default runSyncTasks;

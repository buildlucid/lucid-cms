import { syncServices } from "../../../services/index.js";
import type { Config } from "../../../types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import cliLogger from "../logger.js";

const runSyncTasks = async (
	config: Config,
	mode: "process" | "return",
	kvInstance?: KVAdapterInstance,
): Promise<boolean> => {
	cliLogger.info("Running sync tasks...");

	const kv = kvInstance ?? (await getInitializedKVAdapter(config));
	const shouldDestroyKV = kvInstance === undefined;
	const queue = passthroughQueueAdapter();

	try {
		const [localesResult, collectionsResult, rolesResult] = await Promise.all([
			syncServices.syncLocales({
				db: { client: config.db.client },
				config: config,
				queue: queue,
				env: null,
				kv: kv,
				request: { url: config.baseUrl ?? "" },
			}),
			syncServices.syncCollections({
				db: { client: config.db.client },
				config: config,
				queue: queue,
				env: null,
				kv: kv,
				request: { url: config.baseUrl ?? "" },
			}),
			syncServices.syncRoles({
				db: { client: config.db.client },
				config: config,
				queue: queue,
				env: null,
				kv: kv,
				request: { url: config.baseUrl ?? "" },
			}),
		]);

		if (localesResult.error) {
			cliLogger.error(
				"Sync failed during locale sync, with error:",
				localesResult.error.message || "unknown",
			);
			if (mode === "process") {
				if (shouldDestroyKV) await destroyKVAdapter(kv);
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
				if (shouldDestroyKV) await destroyKVAdapter(kv);
				logger.setBuffering(false);
				process.exit(1);
			} else return false;
		}
		if (rolesResult.error) {
			cliLogger.error(
				"Sync failed during roles sync, with error:",
				rolesResult.error.message || "unknown",
			);
			if (mode === "process") {
				if (shouldDestroyKV) await destroyKVAdapter(kv);
				logger.setBuffering(false);
				process.exit(1);
			} else return false;
		}

		cliLogger.success(
			"Sync tasks completed",
			cliLogger.color.green("successfully"),
		);
		return true;
	} finally {
		if (shouldDestroyKV) await destroyKVAdapter(kv);
	}
};

export default runSyncTasks;

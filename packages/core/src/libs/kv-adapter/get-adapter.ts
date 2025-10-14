import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughKVAdapter from "./adapters/passthrough.js";
import type { KVAdapterInstance } from "./types.js";

/**
 * Returns the ideal KV adapter based on config and the runtime environment
 */
const getKVAdapter = async (config: Config): Promise<KVAdapterInstance> => {
	try {
		if (config.kv) return config.kv();

		const { default: betterSQLiteKVAdapter } = await import(
			"./adapters/better-sqlite.js"
		);
		return betterSQLiteKVAdapter();
	} catch (error) {
		logger.error({
			scope: constants.logScopes.kv,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize KV adapter",
		});
		return passthroughKVAdapter();
	}
};

export default getKVAdapter;

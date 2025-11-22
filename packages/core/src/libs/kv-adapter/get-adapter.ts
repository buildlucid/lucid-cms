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
		if (config.kv?.adapter) {
			const adapter =
				typeof config.kv.adapter === "function"
					? await config.kv.adapter()
					: config.kv.adapter;

			return await adapter;
		}

		const { default: betterSQLiteKVAdapter } = await import(
			"./adapters/better-sqlite.js"
		);
		return await betterSQLiteKVAdapter();
	} catch (error) {
		logger.error({
			scope: constants.logScopes.kvAdapter,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize KV adapter",
		});
		return passthroughKVAdapter();
	}
};

export default getKVAdapter;

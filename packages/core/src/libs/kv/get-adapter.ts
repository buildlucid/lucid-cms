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

		return passthroughKVAdapter();
	} catch (error) {
		logger.error({
			scope: constants.logScopes.kvAdapter,
			message: "Failed to initialize KV adapter",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return passthroughKVAdapter();
	}
};

export default getKVAdapter;

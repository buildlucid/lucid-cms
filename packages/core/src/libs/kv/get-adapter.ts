import type { KVAdapterInstance } from "./types.js";
import type { Config } from "../../types/config.js";
import passthroughKVAdapter from "./adapters/passthrough.js";

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
		return passthroughKVAdapter();
	}
};

export default getKVAdapter;

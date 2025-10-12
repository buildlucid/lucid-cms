import type { KVAdapterInstance } from "./types.js";
import type { Config } from "../../types/config.js";
import passthroughKVAdapter from "./adapters/passthrough.js";

const getQueueAdapter = async (config: Config): Promise<KVAdapterInstance> => {
	try {
		if (config.kv?.adapter) {
			return config.kv.adapter();
		}

		const { default: betterSQLiteKVAdapter } = await import(
			"./adapters/better-sqlite.js"
		);
		return betterSQLiteKVAdapter();
	} catch (error) {
		return passthroughKVAdapter();
	}
};

export default getQueueAdapter;

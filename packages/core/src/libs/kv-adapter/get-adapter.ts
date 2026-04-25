import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
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
		return await betterSQLiteKVAdapter({
			namespace: config.kv?.namespace,
		});
	} catch (error) {
		throw new LucidError({
			scope: constants.logScopes.kvAdapter,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize KV adapter",
		});
	}
};

export default getKVAdapter;

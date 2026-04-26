import type { Config } from "../../types/config.js";
import getKVAdapter from "./get-adapter.js";
import type { KVAdapterInstance } from "./types.js";

/** Resolve the configured KV adapter and run its init lifecycle hook. */
export const getInitializedKVAdapter = async (
	config: Config,
): Promise<KVAdapterInstance> => {
	const adapter = await getKVAdapter(config);
	await adapter.lifecycle?.init?.();
	return adapter;
};

/** Run a KV adapter destroy lifecycle hook when one exists. */
export const destroyKVAdapter = async (
	adapter?: KVAdapterInstance,
): Promise<void> => {
	await adapter?.lifecycle?.destroy?.();
};

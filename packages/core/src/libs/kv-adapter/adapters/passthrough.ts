import type { KVAdapterInstance } from "../types.js";

/**
 * Passthrough KV adapter implementation.
 *
 * This adapter is a no-op implementation of the KVAdapterInstance interface.
 * It does not perform any actual key-value operations and returns as if the operation was successful and that there is no cache.
 */
const passthroughKVAdapter = (): KVAdapterInstance => ({
	type: "kv-adapter",
	key: "passthrough",
	command: {
		get: async () => null,
		set: async () => {},
		has: async () => false,
		delete: async () => {},
		clear: async () => {},
	},
});

export default passthroughKVAdapter;

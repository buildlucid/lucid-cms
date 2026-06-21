import type { KVAdapterInstance } from "../types.js";

/**
 * Passthrough KV adapter implementation.
 *
 * This adapter is a no-op implementation of both KV adapter call shapes.
 * It does not perform any actual key-value operations and returns as if the operation was successful and that there is no cache.
 */
const passthroughKVAdapter = (): KVAdapterInstance => ({
	type: "kv-adapter",
	key: "passthrough",
	get: async () => null,
	set: async () => {},
	has: async () => false,
	delete: async () => {},
	getMany: async (_context, params) => {
		return params.keys.map((key) => ({
			key: typeof key === "string" ? key : key.key,
			value: null,
		}));
	},
	setMany: async () => {},
	deleteMany: async () => {},
	increment: async () => ({ value: 1 }),
	clear: async () => {},
});

export default passthroughKVAdapter;

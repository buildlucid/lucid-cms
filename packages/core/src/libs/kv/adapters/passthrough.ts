import type { KVAdapterInstance } from "../types.js";

const passthroughKVAdapter = async (): Promise<KVAdapterInstance> => {
	console.log("Passthrough KV Adapter initialized");
	return {
		get: async (key: string) => {
			return null;
		},
	};
};

export default passthroughKVAdapter;

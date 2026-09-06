import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import passthroughKVAdapter from "./adapters/passthrough.js";
import type { KVAdapterInstance } from "./types.js";

/** Resolves the configured KV adapter, using passthrough storage when omitted. */
const getKVAdapter = async (
	config: Pick<ResolvedLucidConfig, "kv">,
): Promise<KVAdapterInstance> => {
	if (!config.kv?.adapter) return passthroughKVAdapter();

	try {
		return await (typeof config.kv.adapter === "function"
			? config.kv.adapter()
			: config.kv.adapter);
	} catch (error) {
		if (error instanceof LucidError) throw error;
		throw new LucidError({
			message: "The configured KV adapter could not be initialized.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
	}
};

export default getKVAdapter;

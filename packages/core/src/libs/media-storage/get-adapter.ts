import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import type { MediaStorageAdapterInstance } from "./types.js";

/** Resolves the configured media storage adapter, returning null when omitted. */
const getMediaStorageAdapter = async (config: {
	media: Pick<ResolvedLucidConfig["media"], "storage">;
}): Promise<MediaStorageAdapterInstance | null> => {
	if (!config.media.storage) return null;

	try {
		return await (typeof config.media.storage === "function"
			? config.media.storage()
			: config.media.storage);
	} catch (error) {
		if (error instanceof LucidError) throw error;
		throw new LucidError({
			message: "The configured media storage adapter could not be initialized.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
	}
};

export default getMediaStorageAdapter;

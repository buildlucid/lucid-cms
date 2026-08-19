import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import type { MediaStorageAdapterInstance } from "./types.js";

/** Get the configured media storage adapter. */
const getMediaStorageAdapter = async (
	config: Config,
): Promise<MediaStorageAdapterInstance | null> => {
	try {
		if (config.media.storage) {
			const adapter =
				typeof config.media.storage === "function"
					? await config.media.storage()
					: config.media.storage;

			return await adapter;
		}

		return null;
	} catch (error) {
		logger.error({
			error,
			event: "media-storage-adapter.initialization.failed",
			scope: constants.logScopes.mediaStorageAdapter,
			message: "Failed to initialize media storage adapter",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return null;
	}
};

export default getMediaStorageAdapter;

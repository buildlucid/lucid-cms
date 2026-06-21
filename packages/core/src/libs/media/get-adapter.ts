import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import type { MediaAdapterInstance } from "./types.js";

/**
 * Get the preferred media adapter
 */
const getMediaAdapter = async (
	config: Config,
): Promise<MediaAdapterInstance | null> => {
	try {
		if (config.media.adapter) {
			const adapter =
				typeof config.media.adapter === "function"
					? await config.media.adapter()
					: config.media.adapter;

			return await adapter;
		}

		return null;
	} catch (error) {
		logger.error({
			scope: constants.logScopes.mediaAdapter,
			message: "Failed to initialize media adapter",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return null;
	}
};

export default getMediaAdapter;

import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughMediaDeliveryAdapter from "./adapters/passthrough.js";
import type { MediaDeliveryAdapterInstance } from "./types.js";

/** Resolve the configured delivery adapter, falling back to Lucid's CDN. */
const getMediaDeliveryAdapter = async (
	config: Config,
): Promise<MediaDeliveryAdapterInstance> => {
	try {
		if (config.media.delivery) {
			return typeof config.media.delivery === "function"
				? await config.media.delivery()
				: await config.media.delivery;
		}

		logger.debug({
			scope: constants.logScopes.mediaDeliveryAdapter,
			message:
				"No media delivery adapter configured. Falling back to Lucid CDN delivery.",
		});

		return passthroughMediaDeliveryAdapter();
	} catch (error) {
		logger.error({
			error,
			event: "media-delivery-adapter.initialization.failed",
			scope: constants.logScopes.mediaDeliveryAdapter,
			message: "Failed to initialize media delivery adapter",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return passthroughMediaDeliveryAdapter();
	}
};

export default getMediaDeliveryAdapter;

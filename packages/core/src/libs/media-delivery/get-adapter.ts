import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughMediaDeliveryAdapter from "./adapters/passthrough.js";
import type { MediaDeliveryAdapterInstance } from "./types.js";

/** Resolve the configured delivery adapter, falling back to Lucid's CDN. */
const getMediaDeliveryAdapter = async (
	config: Config,
): Promise<MediaDeliveryAdapterInstance> => {
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
};

export default getMediaDeliveryAdapter;

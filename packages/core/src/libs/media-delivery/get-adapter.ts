import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughMediaDeliveryAdapter from "./adapters/passthrough.js";
import type { MediaDeliveryAdapterInstance } from "./types.js";

/** Resolve the configured delivery adapter, falling back to Lucid's CDN. */
const getMediaDeliveryAdapter = async (
	config: ResolvedLucidConfig,
): Promise<MediaDeliveryAdapterInstance> => {
	if (config.media.deliveryAdapter) {
		return typeof config.media.deliveryAdapter === "function"
			? await config.media.deliveryAdapter()
			: await config.media.deliveryAdapter;
	}

	logger.debug({
		scope: constants.logScopes.mediaDeliveryAdapter,
		message:
			"No media delivery adapter configured. Falling back to Lucid CDN delivery.",
	});

	return passthroughMediaDeliveryAdapter();
};

export default getMediaDeliveryAdapter;

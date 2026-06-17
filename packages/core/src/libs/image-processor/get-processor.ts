import constants from "../../constants/constants.js";
import type { Config, ImageProcessor } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughProcessor from "./processors/passthrough.js";

const getImageProcessor = async (config: Config): Promise<ImageProcessor> => {
	try {
		if (config.media.images.processor) {
			return config.media.images.processor;
		}

		logger.debug({
			scope: constants.logScopes.imageProcessor,
			message:
				"No image processor configured. Falling back to passthrough image processing.",
		});

		return passthroughProcessor;
	} catch (error) {
		logger.error({
			scope: constants.logScopes.imageProcessor,
			message: "Failed to initialize image processor",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return passthroughProcessor;
	}
};

export default getImageProcessor;

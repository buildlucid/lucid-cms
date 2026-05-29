import constants from "../../constants/constants.js";
import type { Config, ImageProcessor } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughProcessor from "./processors/passthrough.js";

/**
 * Returns the ideal Image Processor based on config and the runtime environment
 */
const getImageProcessor = async (_config: Config): Promise<ImageProcessor> => {
	//* disabled for beta release
	// if (config.media.images.processor) {
	// 	return config.media.images.processor;
	// }

	try {
		const { default: sharpProcessor } = await import("./processors/sharp.js");
		return sharpProcessor;
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

import constants from "../../constants/constants.js";
import type { Config, ImageProcessor } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughProcessor from "./processors/passthrough.js";

/**
 * Returns the ideal Image Processor based on config and the runtime environment
 */
const getImageProcessor = async (config: Config): Promise<ImageProcessor> => {
	if (config.media.imageProcessor) {
		return config.media.imageProcessor;
	}

	try {
		const { default: sharpProcessor } = await import("./processors/sharp.js");
		return sharpProcessor;
	} catch (error) {
		logger.error({
			scope: constants.logScopes.imageProcessor,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize image processor",
		});
		return passthroughProcessor;
	}
};

export default getImageProcessor;

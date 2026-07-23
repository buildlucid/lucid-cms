import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughImageProcessor from "./adapters/passthrough.js";
import type { ImageProcessorInstance } from "./types.js";

/**
 * Get the preferred image processor. Falls back to passthrough.
 */
const getImageProcessor = async (
	config: Config,
): Promise<ImageProcessorInstance> => {
	try {
		if (config.media.images.processor) {
			const processor =
				typeof config.media.images.processor === "function"
					? await config.media.images.processor()
					: config.media.images.processor;

			return await processor;
		}

		logger.debug({
			scope: constants.logScopes.imageProcessor,
			message:
				"No image processor configured. Falling back to passthrough image processing.",
		});

		return passthroughImageProcessor();
	} catch (error) {
		logger.error({
			error,
			event: "image-processor.initialization.failed",
			scope: constants.logScopes.imageProcessor,
			message: "Failed to initialize image processor",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return passthroughImageProcessor();
	}
};

export default getImageProcessor;

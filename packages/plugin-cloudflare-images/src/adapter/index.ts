import type { ImageProcessorInstance } from "@lucidcms/core/types";
import { PROCESSOR_KEY } from "../constants.js";
import type { CloudflareImagesPluginOptions } from "../types.js";
import processImage from "./services/process-image.js";

/**
 * Creates a Lucid image processor backed by Cloudflare's raw Images binding.
 */
const cloudflareImagesProcessor = (
	options: CloudflareImagesPluginOptions = {},
): ImageProcessorInstance => ({
	type: "image-processor",
	key: PROCESSOR_KEY,
	process: processImage(options),
});

export default cloudflareImagesProcessor;

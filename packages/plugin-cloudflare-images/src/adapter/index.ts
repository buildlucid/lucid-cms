import type { MediaDeliveryAdapterInstance } from "@lucidcms/core/types";
import { PROCESSOR_KEY } from "../constants.js";
import type { CloudflareImagesPluginOptions } from "../types.js";
import processImage from "./services/process-image.js";

/**
 * Creates Lucid media delivery backed by Cloudflare's raw Images binding.
 */
const cloudflareImagesDeliveryAdapter = (
	options: CloudflareImagesPluginOptions = {},
): MediaDeliveryAdapterInstance => ({
	type: "media-delivery-adapter",
	key: PROCESSOR_KEY,
	resolveFile: () => ({ type: "lucid" }),
	processImage: processImage(options),
});

export default cloudflareImagesDeliveryAdapter;

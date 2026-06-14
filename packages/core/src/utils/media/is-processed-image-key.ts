import { getMediaKeyParts } from "./media-key-tenant.js";
import normalizeMediaKey from "./normalize-media-key.js";

/**
 * Determines if the key is a processed image key within its media scope.
 */
const isProcessedImageKey = (key: string): boolean => {
	return getMediaKeyParts(normalizeMediaKey(key)).isProcessed;
};

export default isProcessedImageKey;

import constants from "../../constants/constants.js";

/**
 * Determines if the key is a processed image key. Ie, has "processed" in the second part of the key.
 */
const isProcessedImageKey = (key: string): boolean => {
	const parts = key.split("/");
	return parts.length >= 2 && parts[1] === constants.media.processedKey;
};

export default isProcessedImageKey;

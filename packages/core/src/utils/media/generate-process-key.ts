import constants from "../../constants/constants.js";
import type { ImageProcessorOptions } from "../../types/config.js";
import getKeyVisibility from "./get-key-visibility.js";

/**
 * Generates a unique key for processed images based on the media key, its options and visibility. Looks like:
 * private/processed/def456-image-w400.webp
 */
const generateProcessKey = (data: {
	key: string;
	options: ImageProcessorOptions;
}) => {
	const lastDotIndex = data.key.lastIndexOf(".");
	const keyWithoutExt = data.key.slice(0, lastDotIndex);
	const ext = data.key.slice(lastDotIndex + 1);

	const visibility = getKeyVisibility(data.key);

	const keyWithoutVisibility = keyWithoutExt.replace(`${visibility}/`, "");

	const suffixes: string[] = [];
	if (data.options.width) suffixes.push(`w${data.options.width}`);
	if (data.options.height) suffixes.push(`h${data.options.height}`);
	if (data.options.quality) suffixes.push(`q${data.options.quality}`);

	const suffix = suffixes.length > 0 ? `-${suffixes.join("-")}` : "";
	const finalExt = data.options.format ?? ext;

	return `${visibility}/${constants.media.processedKey}/${keyWithoutVisibility}${suffix}.${finalExt}`;
};

export default generateProcessKey;

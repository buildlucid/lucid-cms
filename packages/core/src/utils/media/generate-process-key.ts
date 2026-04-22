import constants from "../../constants/constants.js";
import type { ImageProcessorOptions } from "../../types/config.js";
import getKeyVisibility from "./get-key-visibility.js";
import normalizeMediaKey from "./normalize-media-key.js";

/**
 * Generates a unique key for processed images based on the media key, its options and visibility. Looks like:
 * private/processed/def456-image-w400-fwebp
 */
const generateProcessKey = (data: {
	key: string;
	options: ImageProcessorOptions;
	extension?: string | null;
}) => {
	const normalizedKey = normalizeMediaKey(data.key);
	const visibility = getKeyVisibility(normalizedKey);

	const keyWithoutVisibility = normalizedKey.replace(`${visibility}/`, "");

	const suffixes: string[] = [];
	if (data.options.width) suffixes.push(`w${data.options.width}`);
	if (data.options.height) suffixes.push(`h${data.options.height}`);
	if (data.options.quality) suffixes.push(`q${data.options.quality}`);

	const suffix = suffixes.length > 0 ? `-${suffixes.join("-")}` : "";
	const finalFormat = data.options.format ?? data.extension ?? "bin";

	return `${visibility}/${constants.media.processedKey}/${keyWithoutVisibility}${suffix}-f${finalFormat}`;
};

export default generateProcessKey;

import constants from "../../constants/constants.js";
import normalizeMediaKey from "./normalize-media-key.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

/**
 * Infers the visibility based on the media key.
 */
const getKeyVisibility = (key: string): MediaVisibility => {
	const normalizedKey = normalizeMediaKey(key);

	return normalizedKey.startsWith(`${constants.media.visibilityKeys.public}/`)
		? constants.media.visibilityKeys.public
		: constants.media.visibilityKeys.private;
};

export default getKeyVisibility;

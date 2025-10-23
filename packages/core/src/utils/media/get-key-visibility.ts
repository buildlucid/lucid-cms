import constants from "../../constants/constants.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

/**
 * Infers the visibility based on the media key.
 */
const getKeyVisibility = (key: string): MediaVisibility => {
	return key.startsWith(`${constants.media.visibilityKeys.public}/`)
		? constants.media.visibilityKeys.public
		: constants.media.visibilityKeys.private;
};

export default getKeyVisibility;

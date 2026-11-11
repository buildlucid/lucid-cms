import type constants from "../../constants/constants.js";
import { getMediaKeyParts } from "./media-key-parts.js";
import normalizeMediaKey from "./normalize-media-key.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

/** Moves a key under the given visibility. Keys without a visibility root are returned as they are. */
const changeKeyVisibility = (data: {
	key: string;
	visibility: MediaVisibility;
}) => {
	const normalizedKey = normalizeMediaKey(data.key);
	const keyParts = getMediaKeyParts(normalizedKey);
	if (
		keyParts.visibilityIndex === -1 ||
		keyParts.visibility === data.visibility
	) {
		return normalizedKey;
	}

	const parts = [...keyParts.parts];
	parts[keyParts.visibilityIndex] = data.visibility;
	return parts.join("/");
};

export default changeKeyVisibility;

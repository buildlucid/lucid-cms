import type constants from "../../constants/constants.js";
import getKeyVisibility from "./get-key-visibility.js";
import { getMediaKeyParts } from "./media-key-tenant.js";
import normalizeMediaKey from "./normalize-media-key.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

const changeKeyVisibility = (data: {
	key: string;
	visibility: MediaVisibility;
}) => {
	const normalizedKey = normalizeMediaKey(data.key);
	const current = getKeyVisibility(normalizedKey);
	if (current === data.visibility) return normalizedKey;

	const keyParts = getMediaKeyParts(normalizedKey);
	const parts = [...keyParts.parts];
	if (keyParts.visibilityIndex === -1) return normalizedKey;

	parts[keyParts.visibilityIndex] = data.visibility;
	return parts.join("/");
};

export default changeKeyVisibility;

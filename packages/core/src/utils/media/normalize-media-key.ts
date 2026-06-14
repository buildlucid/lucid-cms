import { getMediaKeyParts } from "./media-key-tenant.js";

/**
 * Converts a browser-facing media path back into the canonical storage key.
 * The visual filename segment is ignored so display URLs resolve to storage keys.
 */
const normalizeMediaKey = (key: string) => {
	const keyParts = getMediaKeyParts(key);
	if (keyParts.parts.length === 0) return key;

	if (keyParts.rootIndex === -1) return keyParts.parts.join("/");

	if (keyParts.identity) {
		return keyParts.parts.slice(0, keyParts.identityIndex + 1).join("/");
	}

	return keyParts.parts.join("/");
};

export default normalizeMediaKey;

import constants from "../../constants/constants.js";

/**
 * Converts a browser-facing media path back into the canonical storage key.
 * The visual filename segment is ignored so old and new slugs resolve equally.
 */
const normalizeMediaKey = (key: string) => {
	const parts = key.split("/").filter(Boolean);
	if (parts.length === 0) return key;

	const [visibility] = parts;
	const isVisibilityKey = Object.values(
		constants.media.visibilityKeys,
	).includes(
		visibility as (typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys],
	);
	if (!isVisibilityKey) return parts.join("/");

	if (parts[1] !== constants.media.processedKey && parts[1]) {
		return parts.slice(0, 2).join("/");
	}

	if (parts[1] === constants.media.processedKey && parts[2]) {
		return parts.slice(0, 3).join("/");
	}

	return parts.join("/");
};

export default normalizeMediaKey;

import constants from "../../constants/constants.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

const isVisibilityKey = (value: string | undefined): value is MediaVisibility =>
	value !== undefined &&
	Object.values(constants.media.visibilityKeys).includes(
		value as MediaVisibility,
	);

/**
 * Generated media IDs use UUIDs without dashes.
 */
export const isGeneratedMediaIdSegment = (value: string | undefined) =>
	value !== undefined && /^[a-f0-9]{32}$/i.test(value);

/**
 * Parses the visibility root, processed marker, and identity segments of a media key.
 */
export const getMediaKeyParts = (key: string | string[]) => {
	const parts = Array.isArray(key) ? key : key.split("/").filter(Boolean);
	const visibility = isVisibilityKey(parts[0]) ? parts[0] : null;
	const visibilityIndex = visibility ? 0 : -1;
	const contentIndex = visibilityIndex === -1 ? -1 : visibilityIndex + 1;
	const processedIndex =
		visibilityIndex !== -1 &&
		parts[contentIndex] === constants.media.processedKey
			? contentIndex
			: -1;
	const identityIndex =
		visibilityIndex === -1
			? -1
			: processedIndex === -1
				? contentIndex
				: processedIndex + 1;

	return {
		parts,
		visibility,
		visibilityIndex,
		contentIndex,
		processedIndex,
		identityIndex,
		identity: identityIndex === -1 ? null : (parts[identityIndex] ?? null),
		isProcessed: processedIndex !== -1,
	};
};

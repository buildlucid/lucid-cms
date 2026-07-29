import constants from "../../constants/constants.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

type MediaRoot = MediaVisibility | typeof constants.media.awaitingSyncKey;

const isVisibilityKey = (value: string | undefined): value is MediaVisibility =>
	value !== undefined &&
	Object.values(constants.media.visibilityKeys).includes(
		value as MediaVisibility,
	);

const isRootKey = (value: string | undefined): value is MediaRoot =>
	isVisibilityKey(value) || value === constants.media.awaitingSyncKey;

/**
 * Generated media IDs use UUIDs without dashes.
 */
export const isGeneratedMediaIdSegment = (value: string | undefined) =>
	value !== undefined && /^[a-f0-9]{32}$/i.test(value);

/**
 * Parses the root, processed marker, and identity segments of a media key.
 */
export const getMediaKeyParts = (key: string | string[]) => {
	const parts = Array.isArray(key) ? key : key.split("/").filter(Boolean);
	const root = isRootKey(parts[0]) ? parts[0] : null;
	const rootIndex = root ? 0 : -1;
	const visibility = isVisibilityKey(root ?? undefined) ? root : null;
	const visibilityIndex = visibility ? rootIndex : -1;
	const contentIndex = rootIndex === -1 ? -1 : rootIndex + 1;
	const processedIndex =
		visibilityIndex !== -1 &&
		parts[contentIndex] === constants.media.processedKey
			? contentIndex
			: -1;
	const identityIndex =
		rootIndex === -1
			? -1
			: processedIndex === -1
				? contentIndex
				: processedIndex + 1;

	return {
		parts,
		root,
		rootIndex,
		visibility,
		visibilityIndex,
		contentIndex,
		processedIndex,
		identityIndex,
		identity: identityIndex === -1 ? null : (parts[identityIndex] ?? null),
		isProcessed: processedIndex !== -1,
	};
};

export const getMediaKeyVisibilityIndex = (parts: string[]) =>
	getMediaKeyParts(parts).visibilityIndex;

export const getMediaKeyRootIndex = (parts: string[]) =>
	getMediaKeyParts(parts).rootIndex;

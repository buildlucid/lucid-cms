import type { Settings } from "@types";

/**
 * How much of the media storage limit is used, as a whole percentage. A null
 * total or remaining means no limit is set, so nothing counts as used.
 */
export const getStorageUsage = (
	storage: NonNullable<Settings["media"]>["storage"] | undefined | null,
) => {
	const unlimited =
		storage !== undefined &&
		storage !== null &&
		(storage.total === null || storage.remaining === null);
	const total = storage?.total ?? 0;
	const used = storage?.used ?? 0;

	return {
		unlimited,
		percent:
			unlimited || total <= 0 || used <= 0
				? 0
				: Math.min(100, Math.floor((used / total) * 100)),
	};
};

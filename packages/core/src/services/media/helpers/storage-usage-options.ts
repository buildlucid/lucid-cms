import type {
	MediaStorageOptionName,
	OptionsName,
} from "../../../schemas/options.js";

export const mediaStorageOptionName: MediaStorageOptionName =
	"media_storage_used";

export const getMediaStorageOptionName = (
	tenantKey: string | null | undefined,
): OptionsName => {
	if (!tenantKey) return mediaStorageOptionName;
	return `${mediaStorageOptionName}:t:${tenantKey}` as OptionsName;
};

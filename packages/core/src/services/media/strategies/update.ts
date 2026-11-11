import constants from "../../../constants/constants.js";
import type { MediaType } from "../../../types/response.js";
import mediaAdapterDataSchema from "../../../utils/media/adapter-data.js";
import changeKeyVisibility from "../../../utils/media/change-key-visibility.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import rename from "./rename.js";
import syncMedia, { type SyncedMedia } from "./sync-media.js";

/**
 * Prepares a replacement under its own key and required visibility, leaving the current file
 * intact. The caller deletes the old file after commit.
 */
const update: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			public: boolean;
			replaces: { size: number; type: MediaType };
			expectedSize?: number;
			validation?: { maxBytes?: number; mimeTypes?: readonly string[] };
			allowedType?: MediaType;
		},
	],
	SyncedMedia
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const { public: isPublic, ...upload } = data;
	const syncRes = await syncMedia(context, upload);
	if (syncRes.error) return syncRes;

	//* an upload's visibility is chosen when it starts, so one made before a visibility change is moved
	const key = changeKeyVisibility({
		key: data.key,
		visibility: isPublic
			? constants.media.visibilityKeys.public
			: constants.media.visibilityKeys.private,
	});
	if (key === data.key) return syncRes;

	//* a rollback moves it back to the upload's key, which cleanup removes as an unused upload
	const renameRes = await rename(context, { from: data.key, to: key });
	if (renameRes.error) return renameRes;

	const metaRes = await mediaStorageRes.data.getMeta(context, { key });
	if (metaRes.error) return metaRes;

	return {
		error: undefined,
		data: {
			...syncRes.data,
			key,
			etag: metaRes.data.etag,
			storageAdapterReference: metaRes.data.adapterReference ?? null,
			storageAdapterData: mediaAdapterDataSchema
				.nullable()
				.parse(metaRes.data.adapterData ?? null),
		},
	};
};

export default update;

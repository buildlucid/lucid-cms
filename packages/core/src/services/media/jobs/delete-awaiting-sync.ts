import { MediaAwaitingSyncRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";

/**
 * Deletes expired media that is still awaiting sync
 */
const deleteAwaitingSyncMedia: ServiceFn<
	[
		{
			key: string;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	await mediaStorageRes.data.delete(context, {
		key: data.key,
	});

	const deleteRes = await MediaAwaitingSync.deleteSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: data.key,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteAwaitingSyncMedia;

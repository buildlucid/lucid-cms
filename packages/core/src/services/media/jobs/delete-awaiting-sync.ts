import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { MediaAwaitingSyncRepository } from "../../../libs/repositories/index.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";

const input = z.object({ key: z.string().min(1) });

const deleteAwaitingSyncMedia: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
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

/**
 * Deletes expired media that is still awaiting sync
 */
export const deleteAwaitingSyncMediaJob = defineJob({
	name: "core:delete-unsynced-media",
	version: 1,
	input,
	handler: deleteAwaitingSyncMedia,
	describe: ({ key }) => ({ key }),
});

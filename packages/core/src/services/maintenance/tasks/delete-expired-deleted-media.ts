import { enqueueJobs } from "../../../libs/jobs/enqueue.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import { getRetentionDays } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { hardDeleteSingleMediaJob } from "../../media/jobs/hard-delete-single.js";

/** Queues expired soft-deleted media for permanent deletion. */
const deleteExpiredDeletedMedia: ServiceFn<[], undefined> = async (context) => {
	const Media = new MediaRepository(context.db);

	const compDate = getRetentionDays(context.config.retention, "deletedMedia");

	const softDeletedMediaRes = await Media.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "parent_media_id",
				operator: "is",
				value: null,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
			{
				key: "is_deleted_at",
				operator: "<",
				value: compDate,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (softDeletedMediaRes.error) return softDeletedMediaRes;

	if (softDeletedMediaRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueRes = await enqueueJobs(context, {
		job: hardDeleteSingleMediaJob,
		payload: softDeletedMediaRes.data.map((media) => ({
			mediaId: media.id,
		})),
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredDeletedMedia;

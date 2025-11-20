import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRetentionDays from "./helpers/get-retention-days.js";

/**
 * Finds all soft-deleted media older than 30 days and queues them for permanent deletion
 */
const deleteExpiredDeletedMedia: ServiceFn<[], undefined> = async (context) => {
	const Media = new MediaRepository(context.db, context.config.db);

	const compDate = getRetentionDays(context.config.softDelete, "media");

	const softDeletedMediaRes = await Media.selectMultiple({
		select: ["id"],
		where: [
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

	const queueRes = await context.queue.command.addBatch("media:delete", {
		payloads: softDeletedMediaRes.data.map((media) => ({
			mediaId: media.id,
		})),
		serviceContext: context,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredDeletedMedia;

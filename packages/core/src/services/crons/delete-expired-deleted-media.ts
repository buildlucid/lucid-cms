import Repository from "../../libs/repositories/index.js";
import { subDays } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Finds all soft-deleted media older than 30 days and queues them for permanent deletion
 */
const deleteExpiredDeletedMedia: ServiceFn<[], undefined> = async (context) => {
	const Media = Repository.get("media", context.db, context.config.db);

	// TODO: make this configurable
	const thirtyDaysAgo = subDays(new Date(), 30);

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
				value: thirtyDaysAgo.toISOString(),
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

	const queueRes = await context.queue.addBatch("media:delete", {
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

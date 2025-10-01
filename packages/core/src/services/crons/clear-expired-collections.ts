import { subDays } from "date-fns";
import constants from "../../constants/constants.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Finds all expired collections and queues them for deletion
 */
const clearExpiredCollections: ServiceFn<[], undefined> = async (context) => {
	const Collections = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);

	const now = new Date();
	const thirtyDaysAgo = subDays(now, constants.retention.deletedCollections);
	const thirtyDaysAgoTimestamp = thirtyDaysAgo.toISOString();

	const expiredCollectionsRes = await Collections.selectMultiple({
		select: ["key"],
		where: [
			{
				key: "is_deleted_at",
				operator: "<",
				value: thirtyDaysAgoTimestamp,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (expiredCollectionsRes.error) return expiredCollectionsRes;

	if (expiredCollectionsRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueRes = await context.queue.addBatch("collections:delete", {
		payloads: expiredCollectionsRes.data.map((collection) => ({
			collectionKey: collection.key,
		})),
		serviceContext: context,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredCollections;

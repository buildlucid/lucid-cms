import { CollectionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRetentionDays from "./helpers/get-retention-days.js";

/**
 * Finds all expired collections and queues them for deletion
 */
const clearExpiredCollections: ServiceFn<[], undefined> = async (context) => {
	const Collections = new CollectionsRepository(context.db, context.config.db);

	const compDate = getRetentionDays(context.config.softDelete, "collections");

	const expiredCollectionsRes = await Collections.selectMultiple({
		select: ["key"],
		where: [
			{
				key: "is_deleted_at",
				operator: "<",
				value: compDate,
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

	const queueRes = await context.queue.command.addBatch("collections:delete", {
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

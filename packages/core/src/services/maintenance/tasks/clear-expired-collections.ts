import { enqueueJobs } from "../../../libs/jobs/enqueue.js";
import { CollectionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { deleteCollectionJob } from "../../collections/jobs/delete-single.js";

/** Queues expired collections for deletion. */
const clearExpiredCollections: ServiceFn<[], undefined> = async (context) => {
	const Collections = new CollectionsRepository(context.db);

	const compDate = new Date(
		Date.now() -
			context.config.retention.removedCollections * 24 * 60 * 60 * 1000,
	).toISOString();

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

	const queueRes = await enqueueJobs(context, {
		job: deleteCollectionJob,
		payload: expiredCollectionsRes.data.map((collection) => ({
			collectionKey: collection.key,
		})),
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredCollections;

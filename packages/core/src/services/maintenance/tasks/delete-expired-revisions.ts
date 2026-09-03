import collections from "../../../libs/collection/collections.js";
import { enqueueJobs } from "../../../libs/jobs/enqueue.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { deleteExpiredRevisionsJob } from "../../documents-versions/jobs/delete-expired-revisions.js";

/**
 * Queues expired revisions for collections that have revisions enabled. Each
 * collection uses its own revision retention setting.
 */
const deleteExpiredRevisions: ServiceFn<[], undefined> = async (context) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const collectionsWithRevisions = collectionsRes.data.flatMap((collection) => {
		const retentionDays = collection.getData.revisionRetentionDays;
		return collection.getData.revisions && retentionDays !== false
			? [{ collection, retentionDays }]
			: [];
	});

	if (collectionsWithRevisions.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueResult = await enqueueJobs(context, {
		job: deleteExpiredRevisionsJob,
		payload: collectionsWithRevisions.map(({ collection, retentionDays }) => ({
			collectionKey: collection.key,
			retentionDays,
		})),
	});
	if (queueResult.error) return queueResult;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredRevisions;

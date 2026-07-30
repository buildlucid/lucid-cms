import collections from "../../libs/collection/collections.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Queues jobs to delete expired revisions for each collection that has revisions enabled.
 * Each collection is processed independently based on its revisionRetentionDays config.
 */
const deleteExpiredRevisions: ServiceFn<[], undefined> = async (context) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const collectionsWithRevisions = collectionsRes.data.filter((collection) => {
		const config = collection.getData;
		return config.revisions && config.revisionRetentionDays !== false;
	});

	if (collectionsWithRevisions.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueResults = await Promise.all(
		collectionsWithRevisions.map(async (collection) => {
			const queueRes = await context.queue.add(context, {
				event: "document-versions:delete-expired",
				payload: {
					collectionKey: collection.key,
					retentionDays: collection.getData.revisionRetentionDays,
				},
			});
			return queueRes;
		}),
	);

	for (const result of queueResults) {
		if (result.error) return result;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredRevisions;

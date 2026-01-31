import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Queues jobs to delete expired revisions for each collection that has revisions enabled.
 * Each collection is processed independently based on its revisionRetentionDays config.
 */
const deleteExpiredRevisions: ServiceFn<[], undefined> = async (context) => {
	const collectionsWithRevisions = context.config.collections.filter(
		(collection) =>
			collection.config.config?.useRevisions &&
			collection.config.config?.revisionRetentionDays !== false,
	);

	if (collectionsWithRevisions.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueResults = await Promise.all(
		collectionsWithRevisions.map(async (collection) => {
			const queueRes = await context.queue.add(
				"document-versions:delete-expired",
				{
					payload: {
						collectionKey: collection.key,
						retentionDays: collection.config.config?.revisionRetentionDays,
					},
					context: context,
				},
			);
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

import Repository from "../../libs/repositories/index.js";
import { subDays } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";
import { getDocumentTableSchema } from "../../libs/collection/schema/live/schema-filters.js";

/**
 * Finds all soft-deleted documents for all collections that are older than 30 days and queues them for permanent deletion
 */
const deleteExpiredDeletedDocuments: ServiceFn<[], undefined> = async (
	context,
) => {
	const Documents = Repository.get("documents", context.db, context.config.db);
	const collectionKeys = context.config.collections.map(
		(collection) => collection.key,
	);

	const docTablesRes = await Promise.all(
		collectionKeys.map((key) => getDocumentTableSchema(context, key)),
	);
	for (const item of docTablesRes) {
		if (item.error) return item;
	}

	const docTables = docTablesRes
		.map((table) => table.data)
		.filter((table) => table !== undefined);

	// TODO: Add support for collections to define their own cleanup time, then fallback to a global config option, then 30 days
	const thirtyDaysAgo = subDays(new Date(), 30);

	const expiredDocLookup = await Promise.all(
		docTables.map(async (table) => {
			const softDeletedDocsRes = await Documents.selectMultiple(
				{
					select: ["id", "collection_key", "deleted_by", "created_by"],
					where: [
						{
							key: "is_deleted",
							operator: "=",
							value: true,
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
				},
				{
					tableName: table.name,
				},
			);
			if (softDeletedDocsRes.error) return softDeletedDocsRes;

			if (softDeletedDocsRes.data.length === 0) return;

			const queueRes = await context.queue.addBatch("documents:delete", {
				payloads: softDeletedDocsRes.data.map((d) => ({
					id: d.id,
					collectionKey: d.collection_key,
					userId: d.deleted_by ?? d.created_by,
				})),
				serviceContext: context,
			});
			if (queueRes.error) return queueRes;
		}),
	);
	for (const result of expiredDocLookup) {
		if (result?.error) return result;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredDeletedDocuments;

import { getTableNames } from "../../../libs/collection/schema/live/schema-filters.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { documentServices } from "../../index.js";

/**
 * Deletes expired revisions for a specific collection.
 * A revision is considered expired if:
 * 1. It is older than the collection's revisionRetentionDays
 * 2. It is not referenced by any non-revision version's promoted_from field
 */
const deleteExpiredRevisions: ServiceFn<
	[
		{
			collectionKey: string;
			retentionDays: number;
		},
	],
	undefined
> = async (context, data) => {
	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const DocumentVersions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - data.retentionDays);

	const deleteRes = await DocumentVersions.deleteExpiredRevisions(
		{
			cutoffDate: cutoffDate.toISOString(),
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredRevisions;

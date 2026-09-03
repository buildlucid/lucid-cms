import z from "zod";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";

const input = z.object({
	collectionKey: z.string().min(1),
	retentionDays: z.number().int().nonnegative(),
});

const deleteExpiredRevisions: JobHandler<z.infer<typeof input>> = async (
	context,
	data,
) => {
	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const DocumentVersions = new DocumentVersionsRepository(context.db);
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

/**
 * Deletes expired revisions for a specific collection.
 * A revision is considered expired if:
 * 1. It is older than the collection's revisionRetentionDays
 * 2. It is not referenced by any non-revision version's promoted_from field
 */
export const deleteExpiredRevisionsJob = defineJob({
	name: "core:delete-expired-revisions",
	version: 1,
	input,
	handler: deleteExpiredRevisions,
	describe: ({ collectionKey, retentionDays }) => ({
		collectionKey,
		retentionDays,
	}),
});

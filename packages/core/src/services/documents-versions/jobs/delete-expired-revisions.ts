import z from "zod";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import {
	DocumentReferencesRepository,
	DocumentVersionsRepository,
} from "../../../libs/repositories/index.js";

const input = z.object({
	collectionKey: z.string().min(1),
	retentionDays: z.number().int().nonnegative(),
});

const deleteExpiredRevisions: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const collectionRes = await collections.getSingle(context, {
		key: input.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, input.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const DocumentVersions = new DocumentVersionsRepository(context.db);
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - input.retentionDays);

	const deleteRes = await DocumentVersions.deleteExpiredRevisions(
		{
			cutoffDate: cutoffDate.toISOString(),
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (deleteRes.error) return deleteRes;

	const DocumentReferences = new DocumentReferencesRepository(context.db);
	const pruned = await DocumentReferences.pruneVersions({
		collectionKey: input.collectionKey,
		versionTable: tableNamesRes.data.version,
	});
	if (pruned.error) return pruned;

	return {
		error: undefined,
		data: undefined,
	};
};

/**
 * Deletes expired revisions for a specific collection.
 * A revision is considered expired if:
 * 1. It is older than the collection's revisions.retentionDays
 * 2. It is not referenced by any non-revision version's promoted_from field
 */
export const deleteExpiredRevisionsJob = defineJob({
	name: "core:delete-expired-revisions",
	version: 1,
	input,
	handler: deleteExpiredRevisions,
	describe: ({ input: { collectionKey, retentionDays } }) => ({
		collectionKey,
		retentionDays,
	}),
});

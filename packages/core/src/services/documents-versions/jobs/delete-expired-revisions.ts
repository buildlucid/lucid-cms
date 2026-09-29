import z from "zod";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import acquireDocumentWrites from "../../documents/helpers/acquire-document-writes.js";

const input = z.object({
	collectionKey: z.string().min(1),
	retentionDays: z.number().int().nonnegative(),
});

const deleteExpiredRevisions: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) =>
	withTransaction(context, async (context) => {
		const collectionRes = await collections.getSingle(context, {
			key: input.collectionKey,
		});
		if (collectionRes.error) return collectionRes;

		const tableNamesRes = await getTableNames(context, input.collectionKey);
		if (tableNamesRes.error) return tableNamesRes;

		const DocumentVersions = new DocumentVersionsRepository(context.db);
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - input.retentionDays);

		const candidates = await DocumentVersions.selectMultiple(
			{
				select: ["document_id"],
				where: [
					{ key: "type", operator: "=", value: "revision" },
					{ key: "created_at", operator: "<", value: cutoffDate.toISOString() },
				],
				validation: { enabled: true },
			},
			{ tableName: tableNamesRes.data.version },
		);
		if (candidates.error) return candidates;

		await using claims = new AsyncDisposableStack();
		const documentIds: number[] = [];
		for (const id of [
			...new Set(candidates.data.map((version) => version.document_id)),
		].sort((first, second) => first - second)) {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: input.collectionKey,
				ids: [id],
			});
			if (acquired.error) {
				if (acquired.error.status === 404) continue;
				return acquired;
			}
			claims.use(acquired.data);
			documentIds.push(id);
		}

		const deleteRes = await DocumentVersions.deleteExpiredRevisions(
			{
				collectionKey: input.collectionKey,
				cutoffDate: cutoffDate.toISOString(),
				documentIds,
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
	});

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

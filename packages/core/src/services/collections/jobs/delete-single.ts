import z from "zod";
import nullifyRelationReferences from "../../../libs/collection/custom-fields/fields/relation/nullify-references.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import {
	CollectionsRepository,
	DocumentReferencesRepository,
} from "../../../libs/repositories/index.js";
import notifyCollection from "../../document-references/notify-collection.js";

const input = z.object({ collectionKey: z.string().min(1) });

const deleteCollection: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const Collections = new CollectionsRepository(context.db);

	const deleteRes = await Collections.deleteSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: input.collectionKey,
			},
		],
		returning: ["key"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	const nullified = await nullifyRelationReferences(context, {
		collectionKey: input.collectionKey,
	});
	if (nullified.error) return nullified;

	const notified = await notifyCollection(context, input);
	if (notified.error) return notified;

	const table = buildTableName(
		"document",
		{ collection: input.collectionKey },
		null,
	);
	if (table.error) return table;

	const DocumentReferences = new DocumentReferencesRepository(context.db);
	const removed = await DocumentReferences.deleteCollectionTarget({
		table: table.data.name,
	});
	if (removed.error) return removed;

	return {
		error: undefined,
		data: undefined,
	};
};

/**
 * Deletes a single collection
 */
export const deleteCollectionJob = defineJob({
	name: "core:delete-collection",
	version: 1,
	input,
	handler: deleteCollection,
	describe: ({ input: { collectionKey } }) => ({ collectionKey }),
});

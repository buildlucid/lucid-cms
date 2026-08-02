import type { ServiceFn } from "../../../utils/services/types.js";
import deletePreviewSessions from "../../preview-sessions/delete-for-documents.js";
import beginSingleDeletion from "../helpers/begin-single-deletion.js";
import executeDeleteHook from "../helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "../helpers/invalidate-content-cache.js";
import nullifyDocumentReferences from "../nullify-document-references.js";

/**
 * Deletes a single document
 */
const deleteDocument: ServiceFn<
	[
		{
			id: number;
			collectionKey: string;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const beginRes = await beginSingleDeletion(context, {
		id: data.id,
		collectionKey: data.collectionKey,
		userId: data.userId,
		hardDelete: true,
	});
	if (beginRes.error) return beginRes;
	const { collection, documents, tableNames } = beginRes.data;

	const [deleteDocumentRes, deleteRelationsRes, deletePreviewsRes] =
		await Promise.all([
			documents.deleteSingle(
				{
					where: [
						{
							key: "id",
							operator: "=",
							value: data.id,
						},
					],
					returning: ["id"],
					validation: {
						enabled: true,
					},
				},
				{
					tableName: tableNames.document,
				},
			),
			nullifyDocumentReferences(context, {
				collectionKey: collection.key,
				documentId: data.id,
			}),
			deletePreviewSessions(context, {
				collectionKey: data.collectionKey,
				documentIds: [data.id],
			}),
		]);
	if (deleteDocumentRes.error) return deleteDocumentRes;
	if (deleteRelationsRes.error) return deleteRelationsRes;
	if (deletePreviewsRes.error) return deletePreviewsRes;

	const hookAfterRes = await executeDeleteHook(context, {
		event: "afterDelete",
		collection,
		collectionKey: data.collectionKey,
		tableNames,
		userId: data.userId,
		ids: [data.id],
		hardDelete: true,
	});
	if (hookAfterRes.error) return hookAfterRes;

	await invalidateContentDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteDocument;

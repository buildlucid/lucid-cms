import type { ServiceFn } from "../../types.js";
import cancelPublishOperationsForDocuments from "../document-publish-operations/cancel-for-documents.js";
import deletePreviewSessionsForDocuments from "../preview-sessions/delete-for-documents.js";
import beginSingleDeletion from "./helpers/begin-single-deletion.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";
import nullifyDocumentReferences from "./nullify-document-references.js";

const deleteSingle: ServiceFn<
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
		hardDelete: false,
		activeOnly: true,
		rejectLocked: true,
	});
	if (beginRes.error) return beginRes;
	const { collection, documents, tableNames } = beginRes.data;

	const [deletePageRes, deleteRelationsRes, deletePreviewsRes] =
		await Promise.all([
			documents.updateSingle(
				{
					where: [
						{
							key: "id",
							operator: "=",
							value: data.id,
						},
					],
					data: {
						is_deleted: true,
						is_deleted_at: new Date().toISOString(),
						deleted_by: data.userId,
					},
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
			deletePreviewSessionsForDocuments(context, {
				collectionKey: data.collectionKey,
				documentIds: [data.id],
			}),
		]);
	if (deletePageRes.error) return deletePageRes;
	if (deleteRelationsRes.error) return deleteRelationsRes;
	if (deletePreviewsRes.error) return deletePreviewsRes;

	const cancelRequestsRes = await cancelPublishOperationsForDocuments(context, {
		collectionKey: data.collectionKey,
		documentIds: [data.id],
		comment: context.translate(
			"server:core.documents.deleted.publish.request.comment",
		),
	});
	if (cancelRequestsRes.error) return cancelRequestsRes;

	const hookAfterRes = await executeDeleteHook(context, {
		event: "afterDelete",
		collection,
		collectionKey: data.collectionKey,
		tableNames,
		userId: data.userId,
		ids: [data.id],
		hardDelete: false,
	});
	if (hookAfterRes.error) return hookAfterRes;

	await invalidateContentDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;

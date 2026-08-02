import type { ServiceFn } from "../../types.js";
import cancelPublishOperationsForDocuments from "../document-publish-operations/cancel-for-documents.js";
import deleteWorkflowsForDocuments from "../document-workflows/delete-for-documents.js";
import deletePreviewSessionsForDocuments from "../preview-sessions/delete-for-documents.js";
import beginSingleDeletion from "./helpers/begin-single-deletion.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";
import nullifyDocumentReferences from "./nullify-document-references.js";

const deleteSinglePermanently: ServiceFn<
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

	const [
		deleteDocumentRes,
		deleteRelationsRes,
		deletePreviewsRes,
		cancelRequestsRes,
		workflowDeleteRes,
	] = await Promise.all([
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
		deletePreviewSessionsForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: [data.id],
		}),
		cancelPublishOperationsForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: [data.id],
			comment: context.translate(
				"server:core.documents.permanently.deleted.publish.request.comment",
			),
		}),
		deleteWorkflowsForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: [data.id],
		}),
	]);
	if (deleteDocumentRes.error) return deleteDocumentRes;
	if (deleteRelationsRes.error) return deleteRelationsRes;
	if (deletePreviewsRes.error) return deletePreviewsRes;
	if (cancelRequestsRes.error) return cancelRequestsRes;
	if (workflowDeleteRes.error) return workflowDeleteRes;

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

export default deleteSinglePermanently;

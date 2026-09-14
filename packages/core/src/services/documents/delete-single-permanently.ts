import type { ServiceFn } from "../../exports/types.js";
import { DocumentReferencesRepository } from "../../libs/repositories/index.js";
import type { DocumentEditToken } from "../../libs/toolkit/documents/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import cancelPublishOperationsForDocuments from "../document-publish-operations/cancel-for-documents.js";
import removeTarget from "../document-references/remove-target.js";
import deleteWorkflowsForDocuments from "../document-workflows/delete-for-documents.js";
import deletePreviewSessionsForDocuments from "../preview-sessions/delete-for-documents.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import beginSingleDeletion from "./helpers/begin-single-deletion.js";
import checkEditToken from "./helpers/check-edit-token.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";
import notifyChange from "./notify-change.js";
import nullifyDocumentReferences from "./nullify-document-references.js";

const deleteSinglePermanently: ServiceFn<
	[
		{
			id: number;
			collectionKey: string;
			userId: number | null;
			ifUnchanged?: DocumentEditToken;
		},
	],
	undefined
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: [data.id],
			});
			if (acquired.error) return acquired;

			await using _claims = acquired.data;
			const token = await checkEditToken(context, data);
			if (token.error) return token;

			const beginRes = await beginSingleDeletion(context, {
				id: data.id,
				collectionKey: data.collectionKey,
				userId: data.userId,
				hardDelete: true,
				rejectLocked: true,
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

			const DocumentReferences = new DocumentReferencesRepository(context.db);
			const pruned = await DocumentReferences.pruneVersions({
				collectionKey: data.collectionKey,
				versionTable: tableNames.version,
				documentId: data.id,
			});
			if (pruned.error) return pruned;

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

			const changed = await notifyChange(context, {
				change: { type: "deleted", permanent: true },
				collectionKey: data.collectionKey,
				ids: [data.id],
			});
			if (changed.error) return changed;

			const removedReferences = await removeTarget(context, {
				resource: "documents",
				table: tableNames.document,
				collectionKey: data.collectionKey,
				ids: [data.id],
			});
			if (removedReferences.error) return removedReferences;

			return {
				error: undefined,
				data: undefined,
			};
		},
		{ isolate: true },
	);

export default deleteSinglePermanently;

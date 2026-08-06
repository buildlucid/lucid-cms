import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import cancelPublishOperationsForDocuments from "../document-publish-operations/cancel-for-documents.js";
import deleteWorkflowsForDocuments from "../document-workflows/delete-for-documents.js";
import deletePreviewSessionsForDocuments from "../preview-sessions/delete-for-documents.js";
import checkDocumentAccess from "./checks/check-document-access.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";
import nullifyDocumentReferences from "./nullify-document-references.js";

const deleteMultiplePermanently: ServiceFn<
	[
		{
			ids: number[];
			collectionKey: string;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	if (data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.locked) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.error.locked.collection.name"),
				message: copy("server:core.error.locked.collection.message.delete"),
				status: 400,
			},
			data: undefined,
		};
	}

	const Documents = new DocumentsRepository(context.db);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const accessRes = await checkDocumentAccess(context, {
		collectionKey: data.collectionKey,
		ids: data.ids,
	});
	if (accessRes.error) return accessRes;

	const docsExistRes = await Documents.selectMultiple(
		{
			select: ["id"],
			where: [{ key: "id", operator: "in", value: data.ids }],
			validation: { enabled: true },
		},
		{ tableName: tableNamesRes.data.document },
	);
	if (docsExistRes.error) return docsExistRes;

	const existing = new Set(docsExistRes.data.map((doc) => doc.id));
	const missing = data.ids.filter((id) => !existing.has(id));
	if (missing.length > 0) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.not.found.message"),
				errors: {
					ids: {
						message: copy("server:core.documents.ids.not.found.partial", {
							data: {
								ids: docsExistRes.data.map((doc) => doc.id).join(", "),
							},
						}),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	const hookBeforeRes = await executeDeleteHook(context, {
		event: "beforeDelete",
		collection: collectionRes.data,
		collectionKey: data.collectionKey,
		tableNames: tableNamesRes.data,
		userId: data.userId,
		ids: data.ids,
		hardDelete: true,
	});
	if (hookBeforeRes.error) return hookBeforeRes;

	const nullifyPromises = data.ids.map((id) =>
		nullifyDocumentReferences(context, {
			collectionKey: collectionRes.data.key,
			documentId: id,
		}),
	);

	const [
		deleteDocumentsRes,
		deletePreviewsRes,
		cancelRequestsRes,
		workflowDeleteRes,
		...nullifyResults
	] = await Promise.all([
		Documents.deleteMultiple(
			{
				where: [
					{
						key: "id",
						operator: "in",
						value: data.ids,
					},
				],
				returning: ["id"],
				validation: {
					enabled: true,
				},
			},
			{
				tableName: tableNamesRes.data.document,
			},
		),
		deletePreviewSessionsForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: data.ids,
		}),
		cancelPublishOperationsForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: data.ids,
			comment: context.translate(
				"server:core.documents.permanently.deleted.publish.request.comment",
			),
		}),
		deleteWorkflowsForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: data.ids,
		}),
		...nullifyPromises,
	]);
	if (deleteDocumentsRes.error) return deleteDocumentsRes;
	if (deletePreviewsRes.error) return deletePreviewsRes;
	if (cancelRequestsRes.error) return cancelRequestsRes;
	if (workflowDeleteRes.error) return workflowDeleteRes;
	const nullifyError = nullifyResults.find((result) => result.error);
	if (nullifyError) return nullifyError;

	const hookAfterRes = await executeDeleteHook(context, {
		event: "afterDelete",
		collection: collectionRes.data,
		collectionKey: data.collectionKey,
		tableNames: tableNamesRes.data,
		userId: data.userId,
		ids: data.ids,
		hardDelete: true,
	});
	if (hookAfterRes.error) return hookAfterRes;

	await invalidateContentDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiplePermanently;

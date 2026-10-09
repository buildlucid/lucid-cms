import type { ServiceFn } from "../../exports/types.js";
import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import withTransaction from "../../utils/services/with-transaction.js";
import deletePreviewSessionsForDocuments from "../preview-sessions/delete-for-documents.js";
import invalidateRequests from "../requests/helpers/invalidate-requests.js";
import checkDocumentAccess from "./checks/check-document-access.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";
import nullifyDocumentReferences from "./nullify-document-references.js";

const deleteMultiple: ServiceFn<
	[
		{
			ids: number[];
			collectionKey: string;
			userId: number | null;
			/** The agent run doing it, for `userId` or the system. */
			agentRunId?: string;
			/** The delete request doing the deleting, which keeps its approval. */
			requestId?: number;
		},
	],
	undefined
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: data.ids,
			});
			if (acquired.error) return acquired;

			await using _claims = acquired.data;

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

			if (
				data.requestId === undefined &&
				collectionRes.data.getData.publishing.review?.delete
			) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.delete.review.required"),
						status: 403,
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

			const documentsRes = await Documents.selectMultiple(
				{
					select: ["id"],
					where: [
						{
							key: "id",
							operator: "in",
							value: data.ids,
						},
						{
							key: "is_deleted",
							operator: "=",
							value: context.config.db.getDefault("boolean", "false"),
						},
					],
					validation: {
						enabled: true,
					},
				},
				{
					tableName: tableNamesRes.data.document,
				},
			);
			if (documentsRes.error) return documentsRes;
			if (documentsRes.data.length !== data.ids.length) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.not.found.message"),
						errors: {
							ids: {
								message:
									documentsRes.data.length > 0
										? copy("server:core.documents.ids.not.found.partial", {
												data: {
													ids: documentsRes.data
														.map((doc) => doc.id)
														.join(", "),
												},
											})
										: copy("server:core.documents.ids.not.found.none"),
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
				hardDelete: false,
			});
			if (hookBeforeRes.error) return hookBeforeRes;

			const [deleteDocUpdateRes, deletePreviewsRes, nullifyResult] =
				await Promise.all([
					Documents.updateSingle(
						{
							returning: ["id"],
							where: [
								{
									key: "id",
									operator: "in",
									value: data.ids,
								},
							],
							data: {
								is_deleted: true,
								is_deleted_at: new Date().toISOString(),
								deleted_by: data.userId,
								deleted_by_run_id: data.agentRunId ?? null,
							},
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
					nullifyDocumentReferences(context, {
						collectionKey: collectionRes.data.key,
						documentIds: data.ids,
						requestId: data.requestId,
					}),
				]);
			if (deleteDocUpdateRes.error) return deleteDocUpdateRes;
			if (deletePreviewsRes.error) return deletePreviewsRes;

			if (nullifyResult.error) return nullifyResult;

			const invalidateRequestsRes = await invalidateRequests(context, {
				collectionKey: data.collectionKey,
				documentIds: data.ids,
				requestId: data.requestId,
			});
			if (invalidateRequestsRes.error) return invalidateRequestsRes;

			const hookAfterRes = await executeDeleteHook(context, {
				event: "afterDelete",
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				tableNames: tableNamesRes.data,
				userId: data.userId,
				ids: data.ids,
				hardDelete: false,
			});
			if (hookAfterRes.error) return hookAfterRes;

			await invalidateContentDocumentCache(context, data.collectionKey);

			return {
				data: undefined,
				error: undefined,
			};
		},
		{ isolate: true },
	);

export default deleteMultiple;

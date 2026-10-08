import type { ServiceFn } from "../../exports/types.js";
import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import withTransaction from "../../utils/services/with-transaction.js";
import removeTarget from "../document-references/remove-target.js";
import checkDocumentAccess from "./checks/check-document-access.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import deleteDocumentRecords from "./helpers/delete-document-records.js";
import emitDocumentChange from "./helpers/emit-change.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";

const deleteMultiplePermanently: ServiceFn<
	[
		{
			ids: number[];
			collectionKey: string;
			userId: number | null;
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
					select: ["id", "is_deleted"],
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

			//* collections that review deletions only delete binned documents directly
			if (
				collectionRes.data.getData.publishing.review?.delete &&
				docsExistRes.data.some(
					(doc) => !formatter.formatBoolean(doc.is_deleted),
				)
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

			const deleted = await deleteDocumentRecords(context, {
				collectionKey: data.collectionKey,
				documentIds: data.ids,
				tableName: tableNamesRes.data.document,
			});
			if (deleted.error) return deleted;

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

			const changed = await emitDocumentChange(context, {
				change: { type: "deleted", permanent: true },
				collectionKey: data.collectionKey,
				ids: data.ids,
			});
			if (changed.error) return changed;

			const removedReferences = await removeTarget(context, {
				resource: "documents",
				table: tableNamesRes.data.document,
				collectionKey: data.collectionKey,
				ids: data.ids,
			});
			if (removedReferences.error) return removedReferences;

			return {
				error: undefined,
				data: undefined,
			};
		},
		{ isolate: true },
	);

export default deleteMultiplePermanently;

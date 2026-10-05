import type { ServiceFn } from "../../exports/types.js";
import type { DocumentEditToken } from "../../libs/toolkit/documents/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import removeTarget from "../document-references/remove-target.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import beginSingleDeletion from "./helpers/begin-single-deletion.js";
import checkEditToken from "./helpers/check-edit-token.js";
import deleteDocumentRecords from "./helpers/delete-document-records.js";
import emitDocumentChange from "./helpers/emit-change.js";
import executeDeleteHook from "./helpers/execute-delete-hook.js";
import invalidateContentDocumentCache from "./helpers/invalidate-content-cache.js";

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

			const { collection, tableNames } = beginRes.data;

			const deleted = await deleteDocumentRecords(context, {
				collectionKey: data.collectionKey,
				documentIds: [data.id],
				tableName: tableNames.document,
			});
			if (deleted.error) return deleted;

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

			const changed = await emitDocumentChange(context, {
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

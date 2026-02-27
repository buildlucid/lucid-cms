import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../types.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import { documentServices } from "../index.js";
import invalidateClientDocumentCache from "./helpers/invalidate-client-cache.js";

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

	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.config.isLocked) {
		return {
			error: {
				type: "basic",
				name: T("error_locked_collection_name"),
				message: T("error_locked_collection_message_delete"),
				status: 400,
			},
			data: undefined,
		};
	}

	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

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
				message: T("document_not_found_message"),
				errors: {
					ids: {
						message: T("only_found_ids_error_message", {
							ids: docsExistRes.data.map((doc) => doc.id).join(", "),
						}),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	const hookBeforeRes = await executeHooks(
		{
			service: "documents",
			event: "beforeDelete",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		context,
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: tableNamesRes.data,
				hardDelete: true,
			},
			data: {
				ids: data.ids,
			},
		},
	);
	if (hookBeforeRes.error) return hookBeforeRes;

	const nullifyPromises = data.ids.map((id) =>
		documentServices.nullifyDocumentReferences(context, {
			collectionKey: collectionRes.data.key,
			documentId: id,
		}),
	);

	const [deleteDocumentsRes, ...nullifyResults] = await Promise.all([
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
		...nullifyPromises,
	]);
	if (deleteDocumentsRes.error) return deleteDocumentsRes;

	const nullifyError = nullifyResults.find((result) => result.error);
	if (nullifyError) return nullifyError;

	const hookAfterRes = await executeHooks(
		{
			service: "documents",
			event: "afterDelete",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		context,
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: tableNamesRes.data,
				hardDelete: true,
			},
			data: {
				ids: data.ids,
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	await invalidateClientDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiplePermanently;

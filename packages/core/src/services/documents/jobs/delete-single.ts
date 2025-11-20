import { getTableNames } from "../../../libs/collection/schema/live/schema-filters.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import executeHooks from "../../../utils/hooks/execute-hooks.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { documentServices } from "../../index.js";

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
	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const Documents = new DocumentsRepository(context.db, context.config.db);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const getDocumentRes = await Documents.selectSingle(
		{
			select: ["id"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
				{
					key: "collection_key",
					operator: "=",
					value: data.collectionKey,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					type: "basic",
					message: T("document_not_found_message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (getDocumentRes.error) return getDocumentRes;

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
				ids: [data.id],
			},
		},
	);
	if (hookBeforeRes.error) return hookBeforeRes;

	const [deleteDocumentRes, deleteRelationsRes] = await Promise.all([
		Documents.deleteSingle(
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
				tableName: tableNamesRes.data.document,
			},
		),
		documentServices.nullifyDocumentReferences(context, {
			collectionKey: collectionRes.data.key,
			documentId: data.id,
		}),
	]);
	if (deleteDocumentRes.error) return deleteDocumentRes;
	if (deleteRelationsRes.error) return deleteRelationsRes;

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
				ids: [data.id],
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteDocument;

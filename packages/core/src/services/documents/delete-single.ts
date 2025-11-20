import T from "../../translations/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import type { ServiceFn } from "../../types.js";
import { documentServices } from "../index.js";

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
				{
					key: "is_deleted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
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
				hardDelete: false,
			},
			data: {
				ids: [data.id],
			},
		},
	);
	if (hookBeforeRes.error) return hookBeforeRes;

	const [deletePageRes, deleteRelationsRes] = await Promise.all([
		Documents.updateSingle(
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
				tableName: tableNamesRes.data.document,
			},
		),
		documentServices.nullifyDocumentReferences(context, {
			collectionKey: collectionRes.data.key,
			documentId: data.id,
		}),
	]);
	if (deletePageRes.error) return deletePageRes;
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
				hardDelete: false,
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

export default deleteSingle;

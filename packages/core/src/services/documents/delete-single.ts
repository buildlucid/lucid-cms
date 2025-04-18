import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import type { ServiceFn } from "../../types.js";

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
	const collectionRes =
		await context.services.collection.documents.checks.checkCollection(
			context,
			{
				key: data.collectionKey,
			},
		);
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

	const Documents = Repository.get("documents", context.db, context.config.db);

	const tableNameRes = collectionRes.data.tableNames;
	if (tableNameRes.error) return tableNameRes;

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
			tableName: tableNameRes.data.document,
		},
	);
	if (getDocumentRes.error) return getDocumentRes;

	const hookBeforeRes = await executeHooks(
		{
			service: "collection-documents",
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
			},
			data: {
				ids: [data.id],
			},
		},
	);
	if (hookBeforeRes.error) return hookBeforeRes;

	const deletePageRes = await Documents.updateSingle(
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
			tableName: tableNameRes.data.document,
		},
	);
	if (deletePageRes.error) return deletePageRes;

	// TODO:? remove any reference to this document in field data? more complicated than before due to document table gen, makes more sense to just handle this on get

	const hookAfterRes = await executeHooks(
		{
			service: "collection-documents",
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

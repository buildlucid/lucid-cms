import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import buildTableName from "../collection-migrator/helpers/build-table-name.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import type { LucidDocumentTableName, ServiceFn } from "../../types.js";

const deleteMultiple: ServiceFn<
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

	/*
        - Return early when no ids passed down
        - check if the collection is locked
        - select the documents from the db and compare the length
        - pre delete hook
        - mark the documents as deleted
        - prev version would remove document referencesm we'll hold off for now, can probs just handle get queries better.
        - post delete hook
    */

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

	const documentTableRes = buildTableName<LucidDocumentTableName>("document", {
		collection: data.collectionKey,
	});
	if (documentTableRes.error) return documentTableRes;

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
			tableName: documentTableRes.data,
		},
	);
	if (documentsRes.error) return documentsRes;

	if (documentsRes.data.length !== data.ids.length) {
		return {
			error: {
				type: "basic",
				message: T("document_not_found_message"),
				errorResponse: {
					body: {
						ids: {
							code: "only_found",
							message: T("only_found_ids_error_message", {
								ids: documentsRes.data.map((doc) => doc.id).join(", "),
							}),
						},
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

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
				collectionKey: data.collectionKey,
				userId: data.userId,
			},
			data: {
				ids: data.ids,
			},
		},
	);
	if (hookBeforeRes.error) return hookBeforeRes;

	const deleteDocUpdateRes = await Documents.updateMultiple(
		{
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
			},
		},
		{
			tableName: documentTableRes.data,
		},
	);
	if (deleteDocUpdateRes.error) return deleteDocUpdateRes;

	if (deleteDocUpdateRes.data.length === 0) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

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
				collectionKey: data.collectionKey,
				userId: data.userId,
			},
			data: {
				ids: deletePages.map((page) => page.id),
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	return {
		data: undefined,
		error: undefined,
	};
};

export default deleteMultiple;

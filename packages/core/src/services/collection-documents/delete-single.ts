import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import type { ServiceFn } from "../../utils/services/types.js";

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
		await context.services.collection.document.checks.checkCollection(context, {
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

	const CollectionDocumentsRepo = Repository.get(
		"collection-documents",
		context.db,
		context.config.db,
	);
	const CollectionDocumentFieldsRepo = Repository.get(
		"collection-document-fields",
		context.db,
		context.config.db,
	);

	const getDocument = await CollectionDocumentsRepo.selectSingle({
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
	});

	if (getDocument === undefined) {
		return {
			error: {
				type: "basic",
				message: T("document_not_found_message"),
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

	const [deletePage] = await Promise.all([
		CollectionDocumentsRepo.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
			data: {
				isDeleted: true,
				isDeletedAt: new Date().toISOString(),
				deletedBy: data.userId,
			},
		}),
		CollectionDocumentFieldsRepo.updateMultiple({
			where: [
				{
					key: "document_id",
					operator: "=",
					value: data.id,
				},
			],
			data: {
				documentId: null,
			},
		}),
	]);

	if (deletePage === undefined) {
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

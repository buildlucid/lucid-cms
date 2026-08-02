import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { CollectionTableNames, ServiceFn } from "../../../types.js";
import checkDocumentAccess from "../checks/check-document-access.js";
import executeDeleteHook from "./execute-delete-hook.js";

const beginSingleDeletion: ServiceFn<
	[
		{
			id: number;
			collectionKey: string;
			userId: number;
			hardDelete: boolean;
			activeOnly?: boolean;
			rejectLocked?: boolean;
		},
	],
	{
		collection: CollectionBuilder;
		documents: DocumentsRepository;
		tableNames: CollectionTableNames;
	}
> = async (context, data) => {
	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (data.rejectLocked && collectionRes.data.getData.locked) {
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

	const documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const accessRes = await checkDocumentAccess(context, {
		collectionKey: data.collectionKey,
		id: data.id,
	});
	if (accessRes.error) return accessRes;

	const documentRes = await documents.selectSingle(
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
				...(data.activeOnly
					? [
							{
								key: "is_deleted" as const,
								operator: "=" as const,
								value: context.config.db.getDefault("boolean", "false"),
							},
						]
					: []),
			],
			validation: {
				enabled: true,
				defaultError: {
					type: "basic",
					message: copy("server:core.documents.not.found.message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (documentRes.error) return documentRes;

	const hookRes = await executeDeleteHook(context, {
		event: "beforeDelete",
		collection: collectionRes.data,
		collectionKey: data.collectionKey,
		tableNames: tableNamesRes.data,
		userId: data.userId,
		ids: [data.id],
		hardDelete: data.hardDelete,
	});
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: {
			collection: collectionRes.data,
			documents,
			tableNames: tableNamesRes.data,
		},
	};
};

export default beginSingleDeletion;

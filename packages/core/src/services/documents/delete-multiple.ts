import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../types.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import { documentServices } from "../index.js";

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
				message: T("document_not_found_message"),
				errors: {
					ids: {
						message:
							documentsRes.data.length > 0
								? T("only_found_ids_error_message", {
										ids: documentsRes.data.map((doc) => doc.id).join(", "),
									})
								: T("no_document_ids_found_message"),
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
				hardDelete: false,
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

	const [deleteDocUpdateRes, ...nullifyResults] = await Promise.all([
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
				},
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

	if (deleteDocUpdateRes.error) return deleteDocUpdateRes;

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
				hardDelete: false,
			},
			data: {
				ids: data.ids,
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

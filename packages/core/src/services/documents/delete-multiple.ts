import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import {
	documentPublishOperationServices,
	documentServices,
} from "../index.js";
import invalidateClientDocumentCache from "./helpers/invalidate-client-cache.js";

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

	if (collectionRes.data.getData.config.locked) {
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

	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

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
				message: copy("server:core.documents.not.found.message"),
				errors: {
					ids: {
						message:
							documentsRes.data.length > 0
								? copy("server:core.documents.ids.not.found.partial", {
										data: {
											ids: documentsRes.data.map((doc) => doc.id).join(", "),
										},
									})
								: copy("server:core.documents.ids.not.found.none"),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	const hookBeforeRes = await executeHooks(
		context,
		{
			service: "documents",
			event: "beforeDelete",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: tableNamesRes.data,
				tenantKey: context.request.tenantKey ?? null,
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

	const cancelRequestsRes =
		await documentPublishOperationServices.cancelForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: data.ids,
			comment: context.translate(
				"server:core.documents.deleted.publish.request.comment",
			),
		});
	if (cancelRequestsRes.error) return cancelRequestsRes;

	const hookAfterRes = await executeHooks(
		context,
		{
			service: "documents",
			event: "afterDelete",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: tableNamesRes.data,
				tenantKey: context.request.tenantKey ?? null,
				hardDelete: false,
			},
			data: {
				ids: data.ids,
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	await invalidateClientDocumentCache(context, data.collectionKey);

	return {
		data: undefined,
		error: undefined,
	};
};

export default deleteMultiple;

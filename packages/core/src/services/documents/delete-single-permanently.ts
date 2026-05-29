import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { text } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import {
	documentPublishOperationServices,
	documentServices,
	documentWorkflowServices,
} from "../index.js";
import invalidateClientDocumentCache from "./helpers/invalidate-client-cache.js";

const deleteSinglePermanently: ServiceFn<
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

	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

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
					message: text.server("core.documents.not.found.message"),
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
				hardDelete: true,
			},
			data: {
				ids: [data.id],
			},
		},
	);
	if (hookBeforeRes.error) return hookBeforeRes;

	const [
		deleteDocumentRes,
		deleteRelationsRes,
		cancelRequestsRes,
		workflowDeleteRes,
	] = await Promise.all([
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
		documentPublishOperationServices.cancelForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: [data.id],
			comment: context.translate.server(
				"core.documents.permanently.deleted.publish.request.comment",
			),
		}),
		documentWorkflowServices.deleteForDocuments(context, {
			collectionKey: data.collectionKey,
			documentIds: [data.id],
		}),
	]);
	if (deleteDocumentRes.error) return deleteDocumentRes;
	if (deleteRelationsRes.error) return deleteRelationsRes;
	if (cancelRequestsRes.error) return cancelRequestsRes;
	if (workflowDeleteRes.error) return workflowDeleteRes;

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
				hardDelete: true,
			},
			data: {
				ids: [data.id],
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

export default deleteSinglePermanently;

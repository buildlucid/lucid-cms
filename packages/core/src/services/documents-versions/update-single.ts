import { randomUUID } from "node:crypto";
import { documentVersionsFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { DocumentVersionUpdateResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import invalidateClientDocumentCache from "../documents/helpers/invalidate-client-cache.js";
import { documentBrickServices } from "../index.js";
import getUpdateContext from "./helpers/get-update-context.js";

const updateSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			documentId: number;
			versionId: number;

			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	DocumentVersionUpdateResponse
> = async (context, data) => {
	const Version = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);

	// ----------------------------------------------
	// Checks

	const updateContextRes = await getUpdateContext(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (updateContextRes.error) return updateContextRes;

	// ----------------------------------------------
	// Update document

	//* delete all bricks that belong to the document and version
	const deleteBricksRes = await documentBrickServices.deleteMultiple(context, {
		versionId: data.versionId,
		documentId: data.documentId,
		collectionKey: data.collectionKey,
	});
	if (deleteBricksRes.error) return deleteBricksRes;

	//* create new bricks based on the given data

	// Fire beforeUpsert transform hooks
	const hookResponse = await executeHooks(
		context,
		{
			service: "documents",
			event: "beforeUpsert",
			config: context.config,
			collectionInstance: updateContextRes.data.collection,
		},
		{
			meta: {
				collection: updateContextRes.data.collection,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: updateContextRes.data.tableNames,
				tenantKey: context.request.tenantKey ?? null,
				execution: {
					mode: "upsert",
					action: "update",
					willPersist: true,
				},
			},
			data: {
				documentId: data.documentId,
				versionId: data.versionId,
				versionType: updateContextRes.data.versionType,
				bricks: data.bricks,
				fields: data.fields,
			},
		},
	);
	if (hookResponse.error) return hookResponse;

	// Save bricks for the new version
	const createMultipleBricks = await documentBrickServices.createMultiple(
		context,
		{
			versionId: data.versionId,
			documentId: data.documentId,
			bricks: hookResponse.data.bricks,
			fields: hookResponse.data.fields,
			collection: updateContextRes.data.collection,
		},
	);
	if (createMultipleBricks.error) return createMultipleBricks;

	// Fire afterUpsert hook
	const hookAfterRes = await executeHooks(
		context,
		{
			service: "documents",
			event: "afterUpsert",
			config: context.config,
			collectionInstance: updateContextRes.data.collection,
		},
		{
			meta: {
				collection: updateContextRes.data.collection,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: updateContextRes.data.tableNames,
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				documentId: data.documentId,
				versionId: data.versionId,
				versionType: updateContextRes.data.versionType,
				bricks: hookResponse.data.bricks || [],
				fields: hookResponse.data.fields || [],
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	//* update the version with the updated at/by values
	const contentId = randomUUID();
	const updatedAt = new Date().toISOString();
	const updateVersionRes = await Version.updateSingle(
		{
			where: [{ key: "id", operator: "=", value: data.versionId }],
			data: {
				content_id: contentId,
				collection_migration_id: updateContextRes.data.migrationId,
				updated_by: data.userId,
				updated_at: updatedAt,
			},
			returning: ["id", "type", "content_id", "updated_at"],
			validation: {
				enabled: true,
			},
		},
		{ tableName: updateContextRes.data.tableNames.version },
	);
	if (updateVersionRes.error) return updateVersionRes;

	await invalidateClientDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: documentVersionsFormatter.formatUpdateSingle({
			documentId: data.documentId,
			version: updateVersionRes.data,
		}),
	};
};

export default updateSingle;

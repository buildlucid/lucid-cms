import { randomUUID } from "node:crypto";
import { documentVersionsFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidAuth } from "../../types/hono.js";
import type { DocumentVersionUpdateResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import invalidateContentDocumentCache from "../documents/helpers/invalidate-content-cache.js";
import checkDuplicateOrder from "../documents-bricks/checks/check-duplicate-order.js";
import checkValidateBricksFields from "../documents-bricks/checks/check-validate-bricks-fields.js";
import createDocumentBricks from "../documents-bricks/create-multiple.js";
import deleteDocumentBricks from "../documents-bricks/delete-multiple.js";
import getUpdateContext from "./helpers/get-update-context.js";

const updateSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			authUser?: LucidAuth;
			documentId: number;
			versionId: number;

			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	DocumentVersionUpdateResponse
> = async (context, data) => {
	const Version = new DocumentVersionsRepository(context.db);

	// ----------------------------------------------
	// Checks

	const updateContextRes = await getUpdateContext(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (updateContextRes.error) return updateContextRes;

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
				execution: {
					mode: "upsert",
					action: "update",
					willPersist: true,
					origin: { type: "standard" },
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

	const checkBrickOrderRes = checkDuplicateOrder(
		hookResponse.data.bricks ?? [],
	);
	if (checkBrickOrderRes.error) return checkBrickOrderRes;

	const checkValidateRes = await checkValidateBricksFields(context, {
		collection: updateContextRes.data.collection,
		bricks: hookResponse.data.bricks ?? [],
		fields: hookResponse.data.fields ?? [],
		authUser: data.authUser,
	});
	if (checkValidateRes.error) return checkValidateRes;

	// ----------------------------------------------
	// Update document

	//* delete all bricks that belong to the document and version
	const deleteBricksRes = await deleteDocumentBricks(context, {
		versionId: data.versionId,
		documentId: data.documentId,
		collectionKey: data.collectionKey,
	});
	if (deleteBricksRes.error) return deleteBricksRes;

	// Save bricks for the new version
	const createMultipleBricks = await createDocumentBricks(context, {
		versionId: data.versionId,
		documentId: data.documentId,
		bricks: hookResponse.data.bricks,
		fields: hookResponse.data.fields,
		collection: updateContextRes.data.collection,
		skipValidation: true,
	});
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

	await invalidateContentDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: documentVersionsFormatter.formatUpdateSingle({
			documentId: data.documentId,
			version: updateVersionRes.data,
		}),
	};
};

export default updateSingle;

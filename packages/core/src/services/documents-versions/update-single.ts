import T from "../../translations/index.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import merge from "lodash.merge";
import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import getMigrationStatus from "../../libs/collection/get-collection-migration-status.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { documentBrickServices, documentServices } from "../index.js";

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
	number
> = async (context, data) => {
	const Version = new DocumentVersionsRepository(context.db, context.config.db);

	// ----------------------------------------------
	// Checks

	//* check collection exists
	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	//* check collection is locked
	if (collectionRes.data.getData.config.isLocked) {
		return {
			error: {
				type: "basic",
				name: T("error_locked_collection_name"),
				message: T("error_locked_collection_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	//* check the schema status and if a migration is required
	const migrationStatusRes = await getMigrationStatus(context, {
		collection: collectionRes.data,
	});
	if (migrationStatusRes.error) return migrationStatusRes;

	if (migrationStatusRes.data.requiresMigration) {
		return {
			error: {
				type: "basic",
				name: T("error_schema_migration_required_name"),
				message: T("error_schema_migration_required_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	//* check if document exists within the collection
	const versionExistsRes = await Version.selectSingle(
		{
			select: ["id", "type"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.versionId,
				},
				{
					key: "collection_key",
					operator: "=",
					value: data.collectionKey,
				},
				{
					key: "document_id",
					operator: "=",
					value: data.documentId,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					message: T("version_not_found_message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (versionExistsRes.error) return versionExistsRes;

	if (versionExistsRes.data.type === "revision") {
		return {
			error: {
				type: "basic",
				name: T("error_update_revision_version_name"),
				message: T("error_update_revision_version_message"),
				status: 400,
			},
			data: undefined,
		};
	}

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

	// Fire beforeUpsert hook and merge result with data
	const hookResponse = await executeHooks(
		{
			service: "documents",
			event: "beforeUpsert",
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
			},
			data: {
				documentId: data.documentId,
				versionId: data.versionId,
				versionType: versionExistsRes.data.type,
				bricks: data.bricks,
				fields: data.fields,
			},
		},
	);
	if (hookResponse.error) return hookResponse;

	const bodyData = merge(data, hookResponse.data);

	// Save bricks for the new version
	const createMultipleBricks = await documentBrickServices.createMultiple(
		context,
		{
			versionId: data.versionId,
			documentId: data.documentId,
			bricks: bodyData.bricks,
			fields: bodyData.fields,
			collection: collectionRes.data,
		},
	);
	if (createMultipleBricks.error) return createMultipleBricks;

	// Fire afterUpsert hook
	const hookAfterRes = await executeHooks(
		{
			service: "documents",
			event: "afterUpsert",
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
			},
			data: {
				documentId: data.documentId,
				versionId: data.versionId,
				versionType: versionExistsRes.data.type,
				bricks: bodyData.bricks || [],
				fields: bodyData.fields || [],
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	//* update the version with the updated at/by values
	const updateVersionRes = await Version.updateSingle(
		{
			where: [{ key: "id", operator: "=", value: data.versionId }],
			data: {
				updated_by: data.userId,
				updated_at: new Date().toISOString(),
			},
		},
		{ tableName: tableNamesRes.data.version },
	);
	if (updateVersionRes.error) return updateVersionRes;

	return {
		error: undefined,
		data: data.documentId,
	};
};

export default updateSingle;

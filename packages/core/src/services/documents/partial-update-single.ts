import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import getMigrationStatus from "../../libs/collection/get-collection-migration-status.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";

const partialUpdateSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			documentId: number;
			versionId: number;

			documentFieldsId: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	number
> = async (context, data) => {
	const Document = Repository.get("documents", context.db, context.config.db);
	const Version = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);

	// ----------------------------------------------
	// Checks

	//* check collection exists
	const collectionRes =
		await context.services.collection.documents.checks.checkCollection(
			context,
			{
				key: data.collectionKey,
			},
		);
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

	//* check if auto save is enabled
	if (collectionRes.data.getData.config.useAutoSave) {
		return {
			error: {
				type: "basic",
				name: T("error_auto_save_disabled_name"),
				message: T("error_auto_save_disabled_message"),
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
			select: ["id"],
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

	// ----------------------------------------------
	// Update document

	/*
	 * - Run a partialy validation on the brick/field data. May need an update to the validation rules to allow partial checks
	 * - Grab all of the table names from the collection schema
	 * - Based on the bricks and fields given, using their IDs to update the rows
	 * - Update the document's updated at/by values
	 */

	return {
		error: undefined,
		data: data.documentId,
	};
};

export default partialUpdateSingle;

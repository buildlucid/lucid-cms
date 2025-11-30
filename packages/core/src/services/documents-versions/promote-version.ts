import T from "../../translations/index.js";
import {
	DocumentVersionsRepository,
	DocumentsRepository,
	DocumentBricksRepository,
} from "../../libs/repositories/index.js";
import migrationStatus from "../../libs/collection/get-collection-migration-status.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import aggregateBrickTables from "../documents-bricks/helpers/aggregate-brick-tables.js";
import { documentBricksFormatter } from "../../libs/formatters/index.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/live/schema-filters.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices, documentBrickServices } from "../index.js";

const promoteVersion: ServiceFn<
	[
		{
			fromVersionId: number;
			toVersionType: "latest" | string;
			collectionKey: string;
			documentId: number;
			userId: number;
			skipRevisionCheck?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Versions = new DocumentVersionsRepository(
		context.db,
		context.config.db,
	);
	const Documents = new DocumentsRepository(context.db, context.config.db);
	const DocumentBricks = new DocumentBricksRepository(
		context.db,
		context.config.db,
	);

	// -------------------------------------------------------------------------------
	// Initial data fetch and error checking
	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	//* check the schema status and if a migration is required
	const migrationStatusRes = await migrationStatus(context, {
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

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const [versionRes, bricksQueryRes] = await Promise.all([
		Versions.selectSingle(
			{
				select: ["id", "type", "document_id"],
				where: [
					{
						key: "id",
						operator: "=",
						value: data.fromVersionId,
					},
				],
				validation: {
					enabled: true,
					defaultError: {
						message: T("document_version_not_found_message"),
						status: 404,
					},
				},
			},
			{
				tableName: tableNameRes.data.version,
			},
		),
		DocumentBricks.selectMultipleByVersionId(
			{
				versionId: data.fromVersionId,
				documentId: data.documentId,
				bricksSchema: bricksTableSchemaRes.data,
			},
			{
				tableName: tableNameRes.data.version,
			},
		),
	]);
	if (versionRes.error) return versionRes;
	if (bricksQueryRes.error) return bricksQueryRes;

	if (bricksQueryRes.data === undefined) {
		return {
			error: {
				status: 404,
				message: T("document_version_not_found_message"),
			},
			data: undefined,
		};
	}

	// Additional error checks
	if (versionRes.data.document_id !== data.documentId) {
		return {
			error: {
				type: "basic",
				message: T("document_version_doesnt_belong_to_document"),
				status: 404,
			},
			data: undefined,
		};
	}
	if (versionRes.data.type === data.toVersionType) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("cannot_promote_to_same_version_message"),
			},
			data: undefined,
		};
	}
	if (versionRes.data.type === "revision" && data.skipRevisionCheck !== true) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("cannot_promote_revision_message"),
			},
			data: undefined,
		};
	}
	if (collectionRes.data.getData.config.isLocked === true) {
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

	//-------------------------------------------------------------------------------
	// Mutate/create revisions and update the document
	const [, upsertDocumentRes, createVersionRes] = await Promise.all([
		collectionRes.data.getData.config.useRevisions
			? Versions.updateSingle(
					{
						where: [
							{
								key: "document_id",
								operator: "=",
								value: data.documentId,
							},
							{
								key: "type",
								operator: "=",
								value: data.toVersionType,
							},
						],
						data: {
							type: "revision",
							promoted_from: data.fromVersionId,
							created_by: data.userId,
						},
					},
					{
						tableName: tableNameRes.data.version,
					},
				)
			: Versions.deleteSingle(
					{
						where: [
							{
								key: "document_id",
								operator: "=",
								value: data.documentId,
							},
							{
								key: "type",
								operator: "=",
								value: data.toVersionType,
							},
						],
					},
					{
						tableName: tableNameRes.data.version,
					},
				),
		Documents.upsertSingle(
			{
				data: {
					id: data.documentId,
					collection_key: data.collectionKey,
					created_by: data.userId,
					updated_by: data.userId,
					is_deleted: false,
					updated_at: new Date().toISOString(),
				},
				returning: ["id"],
				validation: {
					enabled: true,
					defaultError: {
						status: 400,
						message: T("failed_to_create_document_or_version"),
					},
				},
			},
			{
				tableName: tableNameRes.data.document,
			},
		),
		Versions.createSingle(
			{
				data: {
					document_id: data.documentId,
					collection_key: data.collectionKey,
					type: data.toVersionType,
					promoted_from: data.fromVersionId,
					created_by: data.userId,
					updated_by: data.userId,
				},
				returning: ["id"],
				validation: {
					enabled: true,
					defaultError: {
						status: 400,
						message: T("failed_to_create_document_or_version"),
					},
				},
			},
			{
				tableName: tableNameRes.data.version,
			},
		),
	]);
	if (upsertDocumentRes.error) return upsertDocumentRes;
	if (createVersionRes.error) return createVersionRes;

	// -------------------------------------------------------------------------------
	// Create new brick tale rows for the new version
	const brickTables = aggregateBrickTables({
		collection: collectionRes.data,
		documentId: data.documentId,
		versionId: createVersionRes.data.id,
		localization: context.config.localization,
		bricks: documentBricksFormatter.formatMultiple({
			bricksQuery: bricksQueryRes.data,
			bricksSchema: bricksTableSchemaRes.data,
			relationMetaData: {},
			collection: collectionRes.data,
			config: context.config,
		}),
		fields: documentBricksFormatter.formatDocumentFields({
			bricksQuery: bricksQueryRes.data,
			bricksSchema: bricksTableSchemaRes.data,
			relationMetaData: {},
			collection: collectionRes.data,
			config: context.config,
		}),
	});
	const sortedTables = brickTables.sort((a, b) => a.priority - b.priority);

	const insertRes = await documentBrickServices.insertBrickTables(context, {
		tables: sortedTables,
		collection: collectionRes.data,
	});
	if (insertRes.error) return insertRes;

	// -------------------------------------------------------------------------------
	// Execute hook
	const hookResponse = await executeHooks(
		{
			service: "documents",
			event: "versionPromote",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		context,
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: tableNameRes.data,
			},
			data: {
				documentId: data.documentId,
				versionId: createVersionRes.data.id,
				versionType: data.toVersionType,
			},
		},
	);
	if (hookResponse.error) return hookResponse;

	// -------------------------------------------------------------------------------
	// Success
	return {
		error: undefined,
		data: undefined,
	};
};

export default promoteVersion;

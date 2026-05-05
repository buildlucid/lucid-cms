import migrationStatus from "../../libs/collection/get-collection-migration-status.js";
import getCurrentCollectionMigrationId from "../../libs/collection/migration/get-current-collection-migration-id.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentBricksFormatter } from "../../libs/formatters/index.js";
import {
	DocumentBricksRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import aggregateBrickTables from "../documents-bricks/helpers/aggregate-brick-tables.js";
import { collectionServices, documentBrickServices } from "../index.js";

const cloneVersion: ServiceFn<
	[
		{
			fromVersionId: number;
			toVersionType: string;
			collectionKey: string;
			documentId: number;
			userId: number;
		},
	],
	{
		versionId: number;
		contentId: string;
		sourceVersionType: string;
	}
> = async (context, data) => {
	const Versions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const DocumentBricks = new DocumentBricksRepository(
		context.db.client,
		context.config.db,
	);

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

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

	const [bricksTableSchemaRes, tableNameRes] = await Promise.all([
		getBricksTableSchema(context, data.collectionKey),
		getTableNames(context, data.collectionKey),
	]);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;
	if (tableNameRes.error) return tableNameRes;

	const [versionRes, bricksQueryRes, migrationIdRes] = await Promise.all([
		Versions.selectSingle(
			{
				select: ["id", "type", "document_id", "content_id"],
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
		getCurrentCollectionMigrationId(context, data.collectionKey),
	]);
	if (versionRes.error) return versionRes;
	if (bricksQueryRes.error) return bricksQueryRes;
	if (migrationIdRes.error) return migrationIdRes;

	if (bricksQueryRes.data === undefined) {
		return {
			error: {
				status: 404,
				message: T("document_version_not_found_message"),
			},
			data: undefined,
		};
	}

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

	const newVersionRes = await Versions.createSingle(
		{
			data: {
				document_id: data.documentId,
				collection_key: data.collectionKey,
				collection_migration_id: migrationIdRes.data,
				type: data.toVersionType,
				promoted_from: data.fromVersionId,
				content_id: versionRes.data.content_id,
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
	);
	if (newVersionRes.error) return newVersionRes;

	const baseUrl = getBaseUrl(context);
	const brickTables = aggregateBrickTables({
		collection: collectionRes.data,
		documentId: data.documentId,
		versionId: newVersionRes.data.id,
		localization: context.config.localization,
		bricks: documentBricksFormatter.formatMultiple({
			bricksQuery: bricksQueryRes.data,
			bricksSchema: bricksTableSchemaRes.data,
			refData: { data: {} },
			collection: collectionRes.data,
			config: context.config,
			host: baseUrl,
		}),
		fields: documentBricksFormatter.formatDocumentFields({
			bricksQuery: bricksQueryRes.data,
			bricksSchema: bricksTableSchemaRes.data,
			refData: { data: {} },
			collection: collectionRes.data,
			config: context.config,
			host: baseUrl,
		}),
		tableNameByteLimit: context.config.db.config.tableNameByteLimit,
	});
	const sortedTables = brickTables.sort((a, b) => a.priority - b.priority);

	const insertRes = await documentBrickServices.insertBrickTables(context, {
		tables: sortedTables,
		collection: collectionRes.data,
	});
	if (insertRes.error) return insertRes;

	return {
		error: undefined,
		data: {
			versionId: newVersionRes.data.id,
			contentId: versionRes.data.content_id,
			sourceVersionType: versionRes.data.type,
		},
	};
};

export default cloneVersion;

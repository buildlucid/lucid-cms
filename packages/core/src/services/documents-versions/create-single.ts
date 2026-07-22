import { randomUUID } from "node:crypto";
import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import getCurrentCollectionMigrationId from "../../libs/collection/migration/get-current-collection-migration-id.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { documentBrickServices } from "../index.js";
import rollbackVersionCreate from "./helpers/rollback-version-create.js";

/**
 * Creates a new version. This is always for the "latest" version type
 */
const createSingle: ServiceFn<
	[
		{
			documentId: number;
			collection: CollectionBuilder;
			userId: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	number
> = async (context, data) => {
	const tableNamesRes = await getTableNames(context, data.collection.key);
	if (tableNamesRes.error) return tableNamesRes;

	const DocumentVersions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const migrationIdRes = await getCurrentCollectionMigrationId(
		context,
		data.collection.key,
	);
	if (migrationIdRes.error) return migrationIdRes;

	const versionType = "latest";

	const currentLatestRes = await DocumentVersions.selectSingle(
		{
			select: ["id"],
			where: [
				{
					key: "document_id",
					operator: "=",
					value: data.documentId,
				},
				{
					key: "type",
					operator: "=",
					value: versionType,
				},
			],
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (currentLatestRes.error) return currentLatestRes;

	const previousLatestId = currentLatestRes.data?.id;

	if (previousLatestId !== undefined) {
		//* retain the current latest as a rollback point until the new version is complete
		const stagePreviousRes = await DocumentVersions.updateSingle(
			{
				where: [
					{
						key: "id",
						operator: "=",
						value: previousLatestId,
					},
				],
				data: {
					type: "revision",
				},
			},
			{
				tableName: tableNamesRes.data.version,
			},
		);
		if (stagePreviousRes.error) return stagePreviousRes;
	}

	// Create new latest version
	const newVersionRes = await DocumentVersions.createSingle(
		{
			data: {
				collection_key: data.collection.key,
				collection_migration_id: migrationIdRes.data,
				document_id: data.documentId,
				type: versionType,
				content_id: randomUUID(),
				created_by: data.userId,
				updated_by: data.userId,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (newVersionRes.error) {
		await rollbackVersionCreate(context, {
			collectionKey: data.collection.key,
			documentId: data.documentId,
			previousLatestId,
			tableName: tableNamesRes.data.version,
			versions: DocumentVersions,
		});
		return newVersionRes;
	}

	// ----------------------------------------------
	// Fire beforeUpsert transform hooks
	const hookResponse = await executeHooks(
		context,
		{
			service: "documents",
			event: "beforeUpsert",
			config: context.config,
			collectionInstance: data.collection,
		},
		{
			meta: {
				collection: data.collection,
				collectionKey: data.collection.key,
				userId: data.userId,
				collectionTableNames: tableNamesRes.data,
				tenantKey: context.request.tenantKey ?? null,
				execution: {
					mode: "upsert",
					action: "create",
					willPersist: true,
				},
			},
			data: {
				documentId: data.documentId,
				versionId: newVersionRes.data.id,
				versionType: versionType,
				bricks: data.bricks,
				fields: data.fields,
			},
		},
	);
	if (hookResponse.error) {
		await rollbackVersionCreate(context, {
			collectionKey: data.collection.key,
			documentId: data.documentId,
			newVersionId: newVersionRes.data.id,
			previousLatestId,
			tableName: tableNamesRes.data.version,
			versions: DocumentVersions,
		});
		return hookResponse;
	}

	// Save bricks for the new version
	const createMultipleBricks = await documentBrickServices.createMultiple(
		context,
		{
			versionId: newVersionRes.data.id,
			documentId: data.documentId,
			bricks: hookResponse.data.bricks,
			fields: hookResponse.data.fields,
			collection: data.collection,
		},
	);
	if (createMultipleBricks.error) {
		await rollbackVersionCreate(context, {
			collectionKey: data.collection.key,
			documentId: data.documentId,
			newVersionId: newVersionRes.data.id,
			previousLatestId,
			tableName: tableNamesRes.data.version,
			versions: DocumentVersions,
		});
		return createMultipleBricks;
	}

	// ----------------------------------------------
	// Fire afterUpsert hook
	const hookAfterRes = await executeHooks(
		context,
		{
			service: "documents",
			event: "afterUpsert",
			config: context.config,
			collectionInstance: data.collection,
		},
		{
			meta: {
				collection: data.collection,
				collectionKey: data.collection.key,
				userId: data.userId,
				collectionTableNames: tableNamesRes.data,
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				documentId: data.documentId,
				versionId: newVersionRes.data.id,
				versionType: versionType,
				bricks: hookResponse.data.bricks || [],
				fields: hookResponse.data.fields || [],
			},
		},
	);
	if (hookAfterRes.error) {
		await rollbackVersionCreate(context, {
			collectionKey: data.collection.key,
			documentId: data.documentId,
			newVersionId: newVersionRes.data.id,
			previousLatestId,
			tableName: tableNamesRes.data.version,
			versions: DocumentVersions,
		});
		return hookAfterRes;
	}

	if (previousLatestId !== undefined) {
		const finalizePreviousRes = data.collection.getData.revisions
			? await DocumentVersions.updateSingle(
					{
						where: [
							{
								key: "id",
								operator: "=",
								value: previousLatestId,
							},
						],
						data: {
							collection_migration_id: migrationIdRes.data,
							created_by: data.userId,
						},
					},
					{
						tableName: tableNamesRes.data.version,
					},
				)
			: await DocumentVersions.deleteSingle(
					{
						where: [
							{
								key: "id",
								operator: "=",
								value: previousLatestId,
							},
						],
					},
					{
						tableName: tableNamesRes.data.version,
					},
				);

		if (finalizePreviousRes.error) {
			await rollbackVersionCreate(context, {
				collectionKey: data.collection.key,
				documentId: data.documentId,
				newVersionId: newVersionRes.data.id,
				previousLatestId,
				tableName: tableNamesRes.data.version,
				versions: DocumentVersions,
			});
			return finalizePreviousRes;
		}
	}

	return {
		error: undefined,
		data: data.documentId,
	};
};

export default createSingle;

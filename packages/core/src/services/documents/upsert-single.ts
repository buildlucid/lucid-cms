import getMigrationStatus from "../../libs/collection/get-collection-migration-status.js";
import getCurrentCollectionMigrationId from "../../libs/collection/migration/get-current-collection-migration-id.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import {
	generateKeyBetween,
	isFractionalOrderKey,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	documentServices,
	documentVersionServices,
	documentWorkflowServices,
} from "../index.js";
import cleanupFailedCreate from "./helpers/cleanup-failed-create.js";
import invalidateClientDocumentCache from "./helpers/invalidate-client-cache.js";

const upsertSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;

			documentId?: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	number
> = async (context, data) => {
	const Document = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

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
	if (collectionRes.data.getData.locked) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.error.locked.collection.name"),
				message: copy("server:core.error.locked.collection.message"),
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
				name: copy("server:core.error.schema.migration.required.name"),
				message: copy("server:core.error.schema.migration.required.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const migrationIdRes = await getCurrentCollectionMigrationId(
		context,
		data.collectionKey,
	);
	if (migrationIdRes.error) return migrationIdRes;

	//* check if document exists within the collection
	if (data.documentId !== undefined) {
		const existingDocumentRes =
			await documentServices.checks.checkDocumentAccess(context, {
				collectionKey: data.collectionKey,
				id: data.documentId,
			});
		if (existingDocumentRes.error) return existingDocumentRes;
	}

	//* for single collections types, check if a document already exists
	const checkDocumentCountRes =
		await documentServices.checks.checkSingleCollectionDocumentCount(context, {
			collectionKey: data.collectionKey,
			collectionMode: collectionRes.data.getData.mode,
			documentId: data.documentId,
			documentTable: tableNamesRes.data.document,
		});
	if (checkDocumentCountRes.error) return checkDocumentCountRes;

	// ----------------------------------------------
	// Data

	//* append new orderable documents after the current last document
	let order: string | undefined;
	if (
		data.documentId === undefined &&
		collectionRes.data.getData.orderable === true
	) {
		const highestOrderRes = await Document.selectHighestOrderKey(
			{
				tenantKey: context.request.tenantKey,
			},
			{
				tableName: tableNamesRes.data.document,
			},
		);
		if (highestOrderRes.error) return highestOrderRes;

		const highestOrder = highestOrderRes.data?.order ?? null;
		order = generateKeyBetween(
			isFractionalOrderKey(highestOrder) ? highestOrder : null,
			null,
		);
	}

	// ----------------------------------------------
	// Upsert document
	const upsertDocRes = await Document.upsertSingle(
		{
			data: {
				id: data.documentId,
				collection_key: data.collectionKey,
				collection_migration_id: migrationIdRes.data,
				//* only applied on insert - the conflict update does not touch tenant_key, so existing documents are never re-stamped
				tenant_key: context.request.tenantKey ?? null,
				//* only applied on insert; reorders use documentServices.updateOrder
				order: order ?? null,
				created_by: data.userId,
				updated_by: data.userId,
				is_deleted: false,
				updated_at: new Date().toISOString(),
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (upsertDocRes.error) return upsertDocRes;

	// ----------------------------------------------
	// Create and manage document versions
	const [createVersionRes, workflowRes] = await Promise.all([
		documentVersionServices.createSingle(context, {
			documentId: upsertDocRes.data.id,
			userId: data.userId,
			bricks: data.bricks,
			fields: data.fields,
			collection: collectionRes.data,
		}),
		data.documentId === undefined
			? documentWorkflowServices.createInitial(context, {
					collectionKey: data.collectionKey,
					documentId: upsertDocRes.data.id,
					userId: data.userId,
				})
			: undefined,
	]);

	if (createVersionRes.error) {
		if (data.documentId === undefined) {
			await cleanupFailedCreate(context, {
				collectionKey: data.collectionKey,
				documentId: upsertDocRes.data.id,
				tableName: tableNamesRes.data.document,
			});
		}
		return createVersionRes;
	}
	if (workflowRes?.error) {
		if (data.documentId === undefined) {
			await cleanupFailedCreate(context, {
				collectionKey: data.collectionKey,
				documentId: upsertDocRes.data.id,
				tableName: tableNamesRes.data.document,
			});
		}
		return workflowRes;
	}

	await invalidateClientDocumentCache(context, data.collectionKey);

	return {
		error: undefined,
		data: upsertDocRes.data.id,
	};
};

export default upsertSingle;

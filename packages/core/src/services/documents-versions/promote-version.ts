import collections from "../../libs/collection/collections.js";
import migrationStatus from "../../libs/collection/get-collection-migration-status.js";
import getCurrentCollectionMigrationId from "../../libs/collection/migration/get-current-collection-migration-id.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentBricksFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import {
	DocumentBricksRepository,
	DocumentsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";

import checkDocumentAccess from "../documents/checks/check-document-access.js";
import acquireDocumentWrites from "../documents/helpers/acquire-document-writes.js";
import invalidateContentDocumentCache from "../documents/helpers/invalidate-content-cache.js";
import notifyChange from "../documents/notify-change.js";
import aggregateBrickTables from "../documents-bricks/helpers/aggregate-brick-tables.js";
import insertBrickTables from "../documents-bricks/insert-brick-tables.js";
import invalidateReleases from "../releases/helpers/invalidate-releases.js";
import recordTargetPublished from "../releases/helpers/record-target-published.js";

const promoteVersion: ServiceFn<
	[
		{
			fromVersionId: number;
			toVersionType: "latest" | string;
			collectionKey: string;
			documentId: number;
			userId: number | null;
			skipRevisionCheck?: boolean;
			/** If set to false, a revision will not be created even if the collection supports revisions. */
			createRevision?: boolean;
			/** Callers that already hold the document's write claim, eg. releases. */
			skipDocumentWriteClaims?: boolean;
			/** The release doing the promoting, which keeps its approval and is left out of the target activity. */
			releaseId?: number;
		},
	],
	undefined
> = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			await using claims = new AsyncDisposableStack();
			if (!data.skipDocumentWriteClaims) {
				const claimRes = await acquireDocumentWrites(context, {
					collectionKey: data.collectionKey,
					ids: [data.documentId],
				});
				if (claimRes.error) return claimRes;

				claims.use(claimRes.data);
			}

			const Versions = new DocumentVersionsRepository(context.db);
			const Documents = new DocumentsRepository(context.db);
			const DocumentBricks = new DocumentBricksRepository(context.db);

			// -------------------------------------------------------------------------------
			// Initial data fetch and error checking
			const collectionRes = await collections.getSingle(context, {
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
						name: copy("server:core.error.schema.migration.required.name"),
						message: copy(
							"server:core.error.schema.migration.required.message",
						),
						status: 400,
					},
					data: undefined,
				};
			}

			const [bricksTableSchemaRes, tableNameRes, documentAccessRes] =
				await Promise.all([
					getBricksTableSchema(context, data.collectionKey),
					getTableNames(context, data.collectionKey),
					checkDocumentAccess(context, {
						collectionKey: data.collectionKey,
						id: data.documentId,
					}),
				]);
			if (bricksTableSchemaRes.error) return bricksTableSchemaRes;
			if (tableNameRes.error) return tableNameRes;
			if (documentAccessRes.error) return documentAccessRes;

			const [versionRes, bricksQueryRes] = await Promise.all([
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
								message: copy(
									"server:core.documents.version.not.found.message",
								),
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
						message: copy("server:core.documents.version.not.found.message"),
					},
					data: undefined,
				};
			}

			// Additional error checks
			if (versionRes.data.document_id !== data.documentId) {
				return {
					error: {
						type: "basic",
						message: copy("server:core.documents.version.document.mismatch"),
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
						message: copy(
							"server:core.documents.versions.promote.same.version",
						),
					},
					data: undefined,
				};
			}

			if (
				versionRes.data.type === "revision" &&
				data.skipRevisionCheck !== true
			) {
				return {
					error: {
						type: "basic",
						status: 400,
						message: copy("server:core.documents.revisions.promote.denied"),
					},
					data: undefined,
				};
			}

			if (collectionRes.data.getData.locked === true) {
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

			const migrationIdRes = await getCurrentCollectionMigrationId(
				context,
				data.collectionKey,
			);
			if (migrationIdRes.error) return migrationIdRes;

			//-------------------------------------------------------------------------------
			// Mutate/create revisions and update the document
			const shouldCreateRevision =
				data.toVersionType === "latest" &&
				collectionRes.data.getData.revisions.enabled &&
				data.createRevision !== false;

			const [previousVersionRes, upsertDocumentRes, createVersionRes] =
				await Promise.all([
					shouldCreateRevision
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
										collection_migration_id: migrationIdRes.data,
										promoted_from: data.fromVersionId,
										created_by: data.userId,
									},
								},
								{
									tableName: tableNameRes.data.version,
								},
							)
						: Versions.deleteVersions(
								{
									collectionKey: data.collectionKey,
									documentId: data.documentId,
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
								collection_migration_id: migrationIdRes.data,
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
									message: copy("server:core.documents.create.failed"),
								},
							},
						},
						{
							tableName: tableNameRes.data.document,
						},
					),
					Versions.createVersion(
						{
							document_id: data.documentId,
							collection_key: data.collectionKey,
							collection_migration_id: migrationIdRes.data,
							type: data.toVersionType,
							promoted_from: data.fromVersionId,
							content_id: versionRes.data.content_id,
							created_by: data.userId,
							updated_by: data.userId,
						},
						{
							tableName: tableNameRes.data.version,
						},
					),
				]);
			if (previousVersionRes.error) return previousVersionRes;
			if (upsertDocumentRes.error) return upsertDocumentRes;
			if (createVersionRes.error) return createVersionRes;

			// -------------------------------------------------------------------------------
			// Create new brick tale rows for the new version
			const baseUrl = getBaseUrl(context);
			const brickTables = aggregateBrickTables({
				collection: collectionRes.data,
				documentId: data.documentId,
				versionId: createVersionRes.data.id,
				localization: context.config.localization,
				bricks: documentBricksFormatter.formatMultiple({
					bricksQuery: bricksQueryRes.data,
					bricksSchema: bricksTableSchemaRes.data,
					collection: collectionRes.data,
					config: context.config,
					host: baseUrl,
				}),
				fields: documentBricksFormatter.formatDocumentFields({
					bricksQuery: bricksQueryRes.data,
					bricksSchema: bricksTableSchemaRes.data,
					collection: collectionRes.data,
					config: context.config,
					host: baseUrl,
				}),
				tableNameByteLimit: context.config.db.config.tableNameByteLimit,
			});
			const sortedTables = brickTables.sort((a, b) => a.priority - b.priority);

			const insertRes = await insertBrickTables(context, {
				tables: sortedTables,
				collection: collectionRes.data,
			});
			if (insertRes.error) return insertRes;

			// -------------------------------------------------------------------------------
			// Execute hook
			const hookResponse = await executeHooks(
				context,
				{
					service: "documents",
					event: "versionPromote",
					config: context.config,
					collectionInstance: collectionRes.data,
				},
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

			const invalidateRes = await invalidateReleases(context, {
				collectionKey: data.collectionKey,
				documentIds: [data.documentId],
				versionType: data.toVersionType,
				releaseId: data.releaseId,
				userId: data.userId,
			});
			if (invalidateRes.error) return invalidateRes;

			if (data.toVersionType !== "latest") {
				const publishedRes = await recordTargetPublished(context, {
					collectionKey: data.collectionKey,
					documentId: data.documentId,
					target: data.toVersionType,
					releaseId: data.releaseId,
					userId: data.userId,
				});
				if (publishedRes.error) return publishedRes;
			}

			await invalidateContentDocumentCache(context, data.collectionKey);

			const changed = await notifyChange(context, {
				change: {
					type: data.toVersionType === "latest" ? "updated" : "published",
					version: data.toVersionType,
				},
				collectionKey: data.collectionKey,
				ids: [data.documentId],
			});
			if (changed.error) return changed;

			// -------------------------------------------------------------------------------
			// Success
			return {
				error: undefined,
				data: undefined,
			};
		},
		{ isolate: true },
	);

export default promoteVersion;

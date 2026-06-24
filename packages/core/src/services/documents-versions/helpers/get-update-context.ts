import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import getMigrationStatus from "../../../libs/collection/get-collection-migration-status.js";
import getCurrentCollectionMigrationId from "../../../libs/collection/migration/get-current-collection-migration-id.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { LucidVersionTable, Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { CollectionTableNames } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { documentServices } from "../../index.js";

const getUpdateContext: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
		},
	],
	{
		collection: CollectionBuilder;
		tableNames: CollectionTableNames;
		migrationId: number;
		versionType: Select<LucidVersionTable>["type"];
	}
> = async (context, data) => {
	const Version = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);

	const collectionRes = await documentServices.checks.checkCollection(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const documentAccessRes = await documentServices.checks.checkDocumentAccess(
		context,
		{
			collectionKey: data.collectionKey,
			id: data.documentId,
		},
	);
	if (documentAccessRes.error) return documentAccessRes;

	if (collectionRes.data.getData.config.locked) {
		return {
			error: {
				type: "basic" as const,
				name: copy("server:core.error.locked.collection.name"),
				message: copy("server:core.error.locked.collection.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const migrationStatusRes = await getMigrationStatus(context, {
		collection: collectionRes.data,
	});
	if (migrationStatusRes.error) return migrationStatusRes;

	if (migrationStatusRes.data.requiresMigration) {
		return {
			error: {
				type: "basic" as const,
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
					message: copy("server:core.documents.versions.not.found.message"),
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
				type: "basic" as const,
				name: copy("server:core.error.update.revision.version.name"),
				message: copy("server:core.error.update.revision.version.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			collection: collectionRes.data,
			tableNames: tableNamesRes.data,
			migrationId: migrationIdRes.data,
			versionType: versionExistsRes.data.type,
		},
	};
};

export default getUpdateContext;

import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { CollectionMigrationsRepository } from "../repositories/index.js";
import stripColumnPrefix from "./helpers/strip-column-prefix.js";
import inferSchema from "./schema/infer-schema.js";
import diffSnapshotVsConfigAdditions from "./schema/runtime/diff-snapshot-vs-config-additions.js";

export type MigrationStatus = {
	requiresMigration: boolean;
	/**
	 * These fields are missing columns in the database. They exist in the current state of the collection/brick fields.
	 */
	missingColumns: Record<string, string[]>;
};

/**
 * Works out if a collection requires migration by comparing the latest
 * persisted schema snapshot with the current inferred schema.
 */
const getMigrationStatus: ServiceFn<
	[{ collection: CollectionBuilder }],
	MigrationStatus
> = async (context, data) => {
	const CollectionMigrations = new CollectionMigrationsRepository(
		context.db.client,
		context.config.db,
	);

	const localSchemaRes = inferSchema(data.collection, context.config.db);
	if (localSchemaRes.error) return localSchemaRes;

	const latestMigrationRes =
		await CollectionMigrations.selectLatestByCollectionKey({
			collectionKey: data.collection.key,
		});
	if (latestMigrationRes.error) return latestMigrationRes;

	if (!latestMigrationRes.data) {
		return {
			data: {
				requiresMigration: true,
				missingColumns: {},
			},
			error: undefined,
		};
	}

	const diff = diffSnapshotVsConfigAdditions(
		latestMigrationRes.data.collection_schema,
		localSchemaRes.data,
	);

	const missingColumns: Record<string, string[]> = {};

	for (const table of localSchemaRes.data.tables) {
		if (
			table.type !== "document-fields" &&
			table.type !== "brick" &&
			table.type !== "repeater"
		) {
			continue;
		}

		const missingTable = diff.missingTableNames.has(table.name);
		const missingColumnNames = diff.missingColumnsByTable.get(table.name);

		const missingFieldColumns = table.columns
			.filter((column) => column.source === "field")
			.filter((column) =>
				missingTable ? true : missingColumnNames?.has(column.name),
			)
			.map((column) => stripColumnPrefix(column.name));

		if (missingFieldColumns.length === 0) continue;

		const tableKey =
			table.type === "document-fields" ? "document-fields" : table.key.brick;
		if (!tableKey) continue;

		if (!missingColumns[tableKey]) {
			missingColumns[tableKey] = [];
		}

		missingColumns[tableKey].push(...missingFieldColumns);
	}

	const requiresMigration =
		diff.missingTableNames.size > 0 || diff.missingColumnsByTable.size > 0;

	return {
		data: {
			requiresMigration,
			missingColumns,
		},
		error: undefined,
	};
};

export default getMigrationStatus;

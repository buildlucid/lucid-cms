import migrateCollections from "./migrate-collections.js";
import stripColumnPrefix from "./helpers/strip-column-prefix.js";
import {
	getCachedMigrationResult,
	setCachedMigrationResult,
} from "./migration/cache.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";

export type MigrationStatus = {
	requiresMigration: boolean;
	/**
	 * These fields are missing columns in the database. They exist in the current state of the collection/brick fields.
	 */
	missingColumns: Record<string, string[]>;
};

/**
 * Works out if a collection requires migration by doing a dry run of the migration process
 */
const getMigrationStatus: ServiceFn<
	[{ collection: CollectionBuilder }],
	MigrationStatus
> = async (context, data) => {
	let migrationResult = getCachedMigrationResult();
	if (!migrationResult) {
		const migrationRes = await migrateCollections(context, { dryRun: true });
		if (migrationRes.error) return migrationRes;

		migrationResult = migrationRes.data;
		setCachedMigrationResult(migrationResult);
	}

	const collectionPlan = migrationResult.migrationPlans.find(
		(plan) => plan.collectionKey === data.collection.key,
	);

	if (!collectionPlan) {
		return {
			data: {
				requiresMigration: false,
				missingColumns: {},
			},
			error: undefined,
		};
	}

	const missingColumns: Record<string, string[]> = {};

	for (const tableMigration of collectionPlan.tables) {
		if (
			tableMigration.tableType !== "document-fields" &&
			tableMigration.tableType !== "brick" &&
			tableMigration.tableType !== "repeater"
		) {
			continue;
		}

		if (tableMigration.type === "create" || tableMigration.type === "modify") {
			const addOperations = tableMigration.columnOperations.filter(
				(op) => op.type === "add",
			);

			if (addOperations.length > 0) {
				const tableKey =
					tableMigration.tableType === "document-fields"
						? "document-fields"
						: tableMigration.key?.brick;

				if (!tableKey) continue;

				if (!missingColumns[tableKey]) {
					missingColumns[tableKey] = [];
				}

				const fieldKeys = addOperations
					.map((op) => {
						return stripColumnPrefix(op.column.name);
					})
					.filter(Boolean);

				missingColumns[tableKey].push(...fieldKeys);
			}
		}
	}

	return {
		data: {
			requiresMigration: collectionPlan.tables.length > 0,
			missingColumns,
		},
		error: undefined,
	};
};

export default getMigrationStatus;

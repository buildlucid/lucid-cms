import constants from "../../../constants/constants.js";
import type { CollectionSchema } from "../../../libs/collection/schema/types.js";
import type DatabaseAdapter from "../../../libs/db/adapter-base.js";
import logger from "../../../libs/logger/index.js";
import type { InferredTable, ServiceResponse } from "../../../types.js";
import determineColumnModType from "../helpers/column-mod-type.js";
import getTablePriority from "../helpers/get-table-priority.js";
import indexesMatch from "../helpers/indexes-match.js";
import normaliseColumn from "../helpers/normalise-column.js";
import determineColumnMods from "./determine-column-mods.js";
import type {
	ColumnOperation,
	IndexOperation,
	MigrationPlan,
	TableMigration,
} from "./types.js";

const DISABLE_REMOVE_TABLES = true;
const PROTECT_NON_REMOVABLE_COLUMNS = true;

/**
 * Diffs configured schema indexes against DB-inferred indexes, only removing
 * Lucid-generated names so manual database indexes are left alone.
 */
const createIndexOperations = (
	currentIndexes: CollectionSchema["tables"][number]["indexes"],
	existingIndexes: InferredTable["indexes"],
): IndexOperation[] => {
	const operations: IndexOperation[] = [];
	const targetIndexes = existingIndexes ?? [];
	const expectedIndexes = currentIndexes ?? [];

	for (const index of expectedIndexes) {
		const targetIndex = targetIndexes.find((item) => item.name === index.name);
		if (!targetIndex) {
			operations.push({
				type: "add",
				index,
			});
			continue;
		}

		if (!indexesMatch(index, targetIndex)) {
			if (targetIndex.name.startsWith(constants.db.generatedIndexPrefix)) {
				operations.push({
					type: "remove",
					index: {
						name: targetIndex.name,
						columns: targetIndex.columns,
						unique: targetIndex.unique,
					},
				});
			}
			operations.push({
				type: "add",
				index,
			});
		}
	}

	for (const index of targetIndexes) {
		const indexStillExists = expectedIndexes.some(
			(item) => item.name === index.name,
		);
		if (indexStillExists) continue;
		if (!index.name.startsWith(constants.db.generatedIndexPrefix)) continue;

		operations.push({
			type: "remove",
			index: {
				name: index.name,
				columns: index.columns,
				unique: index.unique,
			},
		});
	}

	return operations;
};

/**
 * Generates a migration plan for a collection
 */
const generateMigrationPlan = (props: {
	schemas: {
		existing: InferredTable[];
		current: CollectionSchema;
	};
	db: DatabaseAdapter;
}): Awaited<ServiceResponse<MigrationPlan>> => {
	const plan: MigrationPlan = {
		collectionKey: props.schemas.current.key,
		tables: [],
	};

	//* if there is no existing schema, create a full migration plan
	if (props.schemas.existing.length === 0) {
		plan.tables = props.schemas.current.tables
			.map((table) => {
				const tablePrioRes = getTablePriority("collection-inferred", table);
				if (tablePrioRes.error) return null;

				return {
					type: "create",
					tableName: table.name,
					tableType: table.type,
					key: table.key,
					priority: tablePrioRes.data,
					columnOperations: table.columns.map((column) => ({
						type: "add",
						column: normaliseColumn(column, column.source),
					})),
					indexOperations: (table.indexes ?? []).map((index) => ({
						type: "add",
						index,
					})),
				} satisfies TableMigration;
			})
			.filter((t) => t !== null);

		logger.debug({
			message: `Generated a full migration plan for collection "${props.schemas.current.key}"`,
			scope: constants.logScopes.migrations,
		});

		return {
			data: plan,
			error: undefined,
		};
	}

	//* create a partial migration plan
	for (const table of props.schemas.current.tables) {
		const targetTable = props.schemas.existing.find(
			(t) => t.name === table.name,
		);
		if (!targetTable) {
			const tablePrioRes = getTablePriority("collection-inferred", table);
			if (tablePrioRes.error) return tablePrioRes;

			plan.tables.push({
				type: "create",
				tableName: table.name,
				priority: tablePrioRes.data,
				tableType: table.type,
				key: table.key,
				columnOperations: table.columns.map((column) => ({
					type: "add",
					column: normaliseColumn(column, column.source),
				})),
				indexOperations: (table.indexes ?? []).map((index) => ({
					type: "add",
					index,
				})),
			});
			continue;
		}

		const columnOperations: ColumnOperation[] = [];
		const indexOperations = createIndexOperations(
			table.indexes,
			targetTable.indexes,
		);

		for (const column of table.columns) {
			const targetColumn = targetTable.columns.find(
				(c) => c.name === column.name,
			);

			if (!targetColumn) {
				columnOperations.push({
					type: "add",
					column: column,
				});
			} else {
				const modifications = determineColumnMods(
					normaliseColumn(column, column.source),
					normaliseColumn(targetColumn, column.source),
				);
				if (modifications) {
					const modType = determineColumnModType(modifications, props.db);

					if (modType === "drop-and-add") {
						columnOperations.push({
							type: "remove",
							columnName: modifications.column.name,
						});
						columnOperations.push({
							type: "add",
							column: modifications.column,
						});
					} else {
						columnOperations.push(modifications);
					}
				}
			}
		}

		for (const column of targetTable.columns) {
			const columnStillExists = table.columns.some(
				(c) => c.name === column.name,
			);
			if (columnStillExists) continue;

			// DB inferred columns do not include schema metadata, so we infer
			// custom-field columns from the generated prefix.
			const canAutoRemove =
				!PROTECT_NON_REMOVABLE_COLUMNS ||
				!column.name.startsWith(constants.db.generatedColumnPrefix);
			if (!canAutoRemove) continue;

			columnOperations.push({
				type: "remove",
				columnName: column.name,
			});
		}

		if (columnOperations.length || indexOperations.length) {
			const tablePrioRes = getTablePriority("collection-inferred", table);
			if (tablePrioRes.error) return tablePrioRes;

			plan.tables.push({
				type: "modify",
				tableName: table.name,
				priority: tablePrioRes.data,
				tableType: table.type,
				key: table.key,
				columnOperations,
				indexOperations,
			});
		}
	}

	if (!DISABLE_REMOVE_TABLES) {
		for (const table of props.schemas.existing) {
			const tableStillExists = props.schemas.current.tables.some(
				(t) => t.name === table.name,
			);
			if (!tableStillExists) {
				const tablePrioRes = getTablePriority("db-inferred", table);
				if (tablePrioRes.error) return tablePrioRes;

				plan.tables.push({
					type: "remove",
					tableName: table.name,
					priority: tablePrioRes.data,
					// tableType: table.type,
					// key: table.key,
					columnOperations: [],
					indexOperations: [],
				});
			}
		}
	}

	if (plan.tables.length > 0) {
		logger.debug({
			message: `Generated a partial migration plan for collection "${props.schemas.current.key}"`,
			scope: constants.logScopes.migrations,
		});
	}

	return {
		data: plan,
		error: undefined,
	};
};

export default generateMigrationPlan;

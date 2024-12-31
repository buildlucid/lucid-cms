import determineColumnMods from "./determine-column-mods.js";
import determineColumnModType from "../helpers/column-mod-type.js";
import normaliseColumn from "../helpers/normalise-column.js";
import logger from "../../../utils/logging/index.js";
import getTablePriority from "../helpers/get-table-priority.js";
import constants from "../../../constants/constants.js";
import type { ServiceResponse, InferredTable } from "../../../types.js";
import type { CollectionSchema } from "../schema/types.js";
import type {
	MigrationPlan,
	ColumnOperation,
	TableMigration,
} from "./types.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";

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
					priority: tablePrioRes.data,
					columnOperations: table.columns.map((column) => ({
						type: "add",
						column: normaliseColumn(column, column.source),
					})),
				} satisfies TableMigration;
			})
			.filter((t) => t !== null);

		logger("debug", {
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
				columnOperations: table.columns.map((column) => ({
					type: "add",
					column: normaliseColumn(column, column.source),
				})),
			});
			continue;
		}

		const columnOperations: ColumnOperation[] = [];

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
			if (!columnStillExists) {
				columnOperations.push({
					type: "remove",
					columnName: column.name,
				});
			}
		}

		if (columnOperations.length) {
			const tablePrioRes = getTablePriority("collection-inferred", table);
			if (tablePrioRes.error) return tablePrioRes;

			plan.tables.push({
				type: "modify",
				tableName: table.name,
				priority: tablePrioRes.data,
				columnOperations,
			});
		}
	}

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
				columnOperations: [],
			});
		}
	}

	if (plan.tables.length > 0) {
		logger("debug", {
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

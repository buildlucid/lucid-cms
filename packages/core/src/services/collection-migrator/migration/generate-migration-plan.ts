import determineColumnMods from "./determine-column-mods.js";
import logger from "../../../utils/logging/index.js";
import getTablePriority from "../helpers/get-table-priority.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionSchema } from "../schema/types.js";
import type { MigrationPlan, ColumnOperation } from "./types.js";

/**
 * Generates a migration plan for a collection
 * @todo add error handling, logging, etc. Console.log should be replaced with proper logging
 */
const generateMigrationPlan = (props: {
	schemas: {
		existing: CollectionSchema | null;
		current: CollectionSchema;
	};
	checksums: {
		existing: string | null;
		current: string;
	};
}): Awaited<ServiceResponse<MigrationPlan>> => {
	const plan: MigrationPlan = {
		collectionKey: props.schemas.current.key,
		tables: [],
	};

	//* if there is no existing schema, create a full migration plan
	if (props.schemas.existing === null) {
		plan.tables = props.schemas.current.tables.map((table) => ({
			type: "create",
			tableName: table.name,
			priority: getTablePriority(table),
			columnOperations: table.columns.map((column) => ({
				type: "add",
				column,
			})),
		}));

		logger("debug", {
			message: `Full migration plan for: ${props.schemas.current.key}`,
		});

		return {
			data: plan,
			error: undefined,
		};
	}

	//* if the checksums match, no migration is required
	if (props.checksums.existing === props.checksums.current) {
		logger("debug", {
			message: `No migration required for: ${props.schemas.current.key}`,
		});
		return {
			data: plan,
			error: undefined,
		};
	}

	//* create a partial migration plan
	logger("debug", {
		message: `Partial migration plan for: ${props.schemas.current.key}`,
	});

	for (const table of props.schemas.current.tables) {
		const targetTable = props.schemas.existing.tables.find(
			(t) => t.name === table.name,
		);
		if (!targetTable) {
			plan.tables.push({
				type: "create",
				tableName: table.name,
				priority: getTablePriority(table),
				columnOperations: table.columns.map((column) => ({
					type: "add",
					column,
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
				const modifications = determineColumnMods(column, targetColumn);
				if (modifications) {
					columnOperations.push(modifications);
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
			plan.tables.push({
				type: "modify",
				tableName: table.name,
				priority: getTablePriority(table),
				columnOperations,
			});
		}
	}

	for (const table of props.schemas.existing.tables) {
		const tableStillExists = props.schemas.current.tables.some(
			(t) => t.name === table.name,
		);
		if (!tableStillExists) {
			plan.tables.push({
				type: "remove",
				tableName: table.name,
				priority: getTablePriority(table),
				columnOperations: [],
			});
		}
	}

	return {
		data: plan,
		error: undefined,
	};
};

export default generateMigrationPlan;

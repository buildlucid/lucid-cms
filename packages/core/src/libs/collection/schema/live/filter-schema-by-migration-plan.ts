import type { CollectionSchema } from "../types.js";
import type { MigrationPlan } from "../../migration/types.js";
import type { CollectionSchemaTable } from "../types.js";

/**
 * Remove tables/columns from the live schema that haven't been migrated yet
 */
const filterSchemaByMigrationPlan = (
	liveSchema: CollectionSchema,
	migrationPlan: MigrationPlan,
): CollectionSchema => {
	const filteredTables: CollectionSchemaTable[] = [];

	for (const table of liveSchema.tables) {
		const tableMigration = migrationPlan.tables.find(
			(tm) => tm.tableName === table.name,
		);

		//* if table is being created, skip it
		if (tableMigration?.type === "create") {
			continue;
		}

		//* if table is being modified, filter out columns that are being added
		if (tableMigration?.type === "modify") {
			const columnsToAdd = new Set(
				tableMigration.columnOperations
					.filter((op) => op.type === "add")
					.map((op) => op.column.name),
			);

			const filteredColumns = table.columns.filter(
				(col) => !columnsToAdd.has(col.name),
			);

			//* only include table if it has remaining columns
			if (filteredColumns.length > 0) {
				filteredTables.push({
					...table,
					columns: filteredColumns,
				});
			}
		} else {
			//* table exists and no modifications, include as-is
			filteredTables.push(table);
		}
	}

	return {
		...liveSchema,
		tables: filteredTables,
	};
};

export default filterSchemaByMigrationPlan;

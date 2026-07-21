import type { CollectionSchema, CollectionSchemaTable } from "../types.js";
import type { SchemaConfigDiff } from "./diff-snapshot-vs-config.js";

/**
 * Builds a runtime-safe schema by removing additive config changes that are not
 * yet present in the persisted migration snapshot.
 */
const buildRuntimeSchema = (
	localSchema: CollectionSchema,
	diff: SchemaConfigDiff,
): CollectionSchema => {
	const filteredTables: CollectionSchemaTable[] = [];

	for (const table of localSchema.tables) {
		if (diff.missingTableNames.has(table.name)) {
			continue;
		}

		const missingColumns = diff.missingColumnsByTable.get(table.name);
		const missingIndexes = diff.missingIndexesByTable.get(table.name);
		if (
			(!missingColumns || missingColumns.size === 0) &&
			(!missingIndexes || missingIndexes.size === 0)
		) {
			filteredTables.push(table);
			continue;
		}

		const filteredColumns = missingColumns
			? table.columns.filter((column) => !missingColumns.has(column.name))
			: table.columns;
		if (filteredColumns.length === 0) continue;

		const filteredIndexes = missingIndexes
			? (table.indexes ?? []).filter((index) => !missingIndexes.has(index.name))
			: table.indexes;

		filteredTables.push({
			...table,
			columns: filteredColumns,
			indexes: filteredIndexes,
		});
	}

	return {
		...localSchema,
		tables: filteredTables,
	};
};

export default buildRuntimeSchema;

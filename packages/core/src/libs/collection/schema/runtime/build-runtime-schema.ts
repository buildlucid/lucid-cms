import type { CollectionSchema, CollectionSchemaTable } from "../types.js";
import type { SchemaAdditionsDiff } from "./diff-snapshot-vs-config-additions.js";

/**
 * Builds a runtime-safe schema by removing additive config changes that are not
 * yet present in the persisted migration snapshot.
 */
const buildRuntimeSchema = (
	localSchema: CollectionSchema,
	diff: SchemaAdditionsDiff,
): CollectionSchema => {
	const filteredTables: CollectionSchemaTable[] = [];

	for (const table of localSchema.tables) {
		if (diff.missingTableNames.has(table.name)) {
			continue;
		}

		const missingColumns = diff.missingColumnsByTable.get(table.name);
		if (!missingColumns || missingColumns.size === 0) {
			filteredTables.push(table);
			continue;
		}

		const filteredColumns = table.columns.filter(
			(column) => !missingColumns.has(column.name),
		);
		if (filteredColumns.length === 0) continue;

		filteredTables.push({
			...table,
			columns: filteredColumns,
		});
	}

	return {
		...localSchema,
		tables: filteredTables,
	};
};

export default buildRuntimeSchema;

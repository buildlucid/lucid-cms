import type { CollectionSchema } from "../types.js";

export type SchemaAdditionsDiff = {
	missingTableNames: Set<string>;
	missingColumnsByTable: Map<string, Set<string>>;
};

/**
 * Compares a persisted migration snapshot with the current config-inferred
 * schema and returns additive deltas only.
 */
const diffSnapshotVsConfigAdditions = (
	snapshotSchema: CollectionSchema,
	configSchema: CollectionSchema,
): SchemaAdditionsDiff => {
	const missingTableNames = new Set<string>();
	const missingColumnsByTable = new Map<string, Set<string>>();

	for (const configTable of configSchema.tables) {
		const snapshotTable = snapshotSchema.tables.find(
			(t) => t.name === configTable.name,
		);

		if (!snapshotTable) {
			missingTableNames.add(configTable.name);
			missingColumnsByTable.set(
				configTable.name,
				new Set(configTable.columns.map((column) => column.name)),
			);
			continue;
		}

		const snapshotColumnNames = new Set(
			snapshotTable.columns.map((column) => column.name),
		);

		const missingColumns = configTable.columns
			.filter((column) => !snapshotColumnNames.has(column.name))
			.map((column) => column.name);

		if (missingColumns.length > 0) {
			missingColumnsByTable.set(configTable.name, new Set(missingColumns));
		}
	}

	return {
		missingTableNames,
		missingColumnsByTable,
	};
};

export default diffSnapshotVsConfigAdditions;

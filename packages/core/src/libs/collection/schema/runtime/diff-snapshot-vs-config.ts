import indexesMatch from "../../helpers/indexes-match.js";
import determineColumnMods from "../../migration/determine-column-mods.js";
import type { CollectionSchema } from "../types.js";

/** Configured additions and definition differences, intentionally excluding removals. */
export type SchemaConfigDiff = {
	missingTableNames: Set<string>;
	missingColumnsByTable: Map<string, Set<string>>;
	missingIndexesByTable: Map<string, Set<string>>;
	modifiedColumnsByTable: Map<string, Set<string>>;
	modifiedIndexesByTable: Map<string, Set<string>>;
};
/**
 * Compares a persisted migration snapshot with the current config-inferred
 * schema, including definition changes while intentionally ignoring removals.
 */
const diffSnapshotVsConfig = (
	snapshotSchema: CollectionSchema,
	configSchema: CollectionSchema,
): SchemaConfigDiff => {
	const missingTableNames = new Set<string>();
	const missingColumnsByTable = new Map<string, Set<string>>();
	const missingIndexesByTable = new Map<string, Set<string>>();
	const modifiedColumnsByTable = new Map<string, Set<string>>();
	const modifiedIndexesByTable = new Map<string, Set<string>>();

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
			const missingIndexes = (configTable.indexes ?? []).map(
				(index) => index.name,
			);
			if (missingIndexes.length > 0) {
				missingIndexesByTable.set(configTable.name, new Set(missingIndexes));
			}
			continue;
		}

		const snapshotColumnsByName = new Map(
			snapshotTable.columns.map((column) => [column.name, column]),
		);

		const missingColumns = configTable.columns
			.filter((column) => !snapshotColumnsByName.has(column.name))
			.map((column) => column.name);

		if (missingColumns.length > 0) {
			missingColumnsByTable.set(configTable.name, new Set(missingColumns));
		}

		const modifiedColumns = configTable.columns
			.filter((column) => {
				const snapshotColumn = snapshotColumnsByName.get(column.name);
				return (
					snapshotColumn !== undefined &&
					determineColumnMods(column, snapshotColumn) !== null
				);
			})
			.map((column) => column.name);
		if (modifiedColumns.length > 0) {
			modifiedColumnsByTable.set(configTable.name, new Set(modifiedColumns));
		}

		const snapshotIndexesByName = new Map(
			(snapshotTable.indexes ?? []).map((index) => [index.name, index]),
		);

		const missingIndexes = (configTable.indexes ?? [])
			.filter((index) => !snapshotIndexesByName.has(index.name))
			.map((index) => index.name);

		if (missingIndexes.length > 0) {
			missingIndexesByTable.set(configTable.name, new Set(missingIndexes));
		}

		const modifiedIndexes = (configTable.indexes ?? [])
			.filter((index) => {
				const snapshotIndex = snapshotIndexesByName.get(index.name);
				return snapshotIndex && !indexesMatch(index, snapshotIndex);
			})
			.map((index) => index.name);
		if (modifiedIndexes.length > 0) {
			modifiedIndexesByTable.set(configTable.name, new Set(modifiedIndexes));
		}
	}

	return {
		missingTableNames,
		missingColumnsByTable,
		missingIndexesByTable,
		modifiedColumnsByTable,
		modifiedIndexesByTable,
	};
};

export default diffSnapshotVsConfig;

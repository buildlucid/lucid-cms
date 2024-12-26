import type { CollectionSchemaColumn } from "../schema/types.js";
import type { ModifyColumnOperation } from "./types.js";

/**
 * Determines if two foreign keys are equal
 */
const areForeignKeysEqual = (
	newKey?: CollectionSchemaColumn["foreignKey"],
	existingKey?: CollectionSchemaColumn["foreignKey"],
): boolean => {
	if (!newKey && !existingKey) return true;
	if (!newKey || !existingKey) return false;

	return (
		newKey.table === existingKey.table &&
		newKey.column === existingKey.column &&
		newKey.onDelete === existingKey.onDelete &&
		newKey.onUpdate === existingKey.onUpdate
	);
};

/**
 * Determines the modifications required to convert an existing column to a new column
 */
const determineColumnMods = (
	newColumn: CollectionSchemaColumn,
	existingColumn: CollectionSchemaColumn,
): ModifyColumnOperation | null => {
	const changes: ModifyColumnOperation["changes"] = {};

	if (newColumn.type !== existingColumn.type) {
		changes.type = {
			from: existingColumn.type,
			to: newColumn.type,
		};
	}

	if (newColumn.nullable !== existingColumn.nullable) {
		changes.nullable = {
			from: existingColumn.nullable,
			to: newColumn.nullable,
		};
	}

	if (
		JSON.stringify(newColumn.default) !== JSON.stringify(existingColumn.default)
	) {
		changes.default = {
			from: existingColumn.default,
			to: newColumn.default,
		};
	}

	if (!areForeignKeysEqual(newColumn.foreignKey, existingColumn.foreignKey)) {
		changes.foreignKey = {
			from: existingColumn.foreignKey,
			to: newColumn.foreignKey,
		};
	}

	if (newColumn.unique !== existingColumn.unique) {
		changes.unique = {
			from: existingColumn.unique,
			to: newColumn.unique,
		};
	}

	return Object.keys(changes).length > 0
		? {
				type: "modify",
				column: newColumn,
				changes,
			}
		: null;
};

export default determineColumnMods;

import constants from "../../../../constants/constants.js";
import type { CustomFieldTableType, TableType } from "../../schema/types.js";
import registeredFields, {
	registeredFieldTypes,
} from "../registered-fields.js";
import type { FieldDatabaseConfig, FieldDatabaseMode } from "../types.js";
import { columnMode } from "./column.js";
import { relationTableMode } from "./relation-table.js";
import { treeTableMode } from "./tree-table.js";
import type { TableBackedFieldDatabaseConfig } from "./types.js";

export const storageModes = {
	column: columnMode,
	"relation-table": relationTableMode,
	"tree-table": treeTableMode,
} as const;

/**
 * Returns true when the provided table type is a custom-field table type.
 */
export const isCustomFieldTableType = (
	tableType: TableType,
): tableType is CustomFieldTableType => {
	return tableType.startsWith(constants.db.customFieldTablePrefix);
};

/**
 * Resolves the registered field database config for a custom-field table type.
 * Returns null when the table is not custom-field-backed or has no matching field.
 */
export const getFieldDatabaseConfig = (
	tableType: TableType,
): TableBackedFieldDatabaseConfig | null => {
	if (!isCustomFieldTableType(tableType)) return null;

	for (const fieldType of registeredFieldTypes) {
		const databaseConfig = registeredFields[fieldType].config.database;
		if (databaseConfig.mode === "column") continue;
		if (databaseConfig.tableType !== tableType) continue;

		return databaseConfig;
	}

	return null;
};

/**
 * Type guard that narrows a field database config by storage mode.
 */
export const isStorageMode = <M extends FieldDatabaseMode>(
	config: FieldDatabaseConfig,
	mode: M,
): config is Extract<FieldDatabaseConfig, { mode: M }> => {
	return config.mode === mode;
};

/**
 * Returns the base migration priority for a non-column storage mode.
 */
export const getStorageModeBasePriority = (
	mode: Exclude<FieldDatabaseMode, "column">,
): number => {
	return storageModes[mode].baseTablePriority;
};

/**
 * Returns true when the provided table type is backed by tree-table storage mode.
 */
export const isTreeTableType = (tableType: TableType): boolean => {
	const databaseConfig = getFieldDatabaseConfig(tableType);
	return !!databaseConfig && isStorageMode(databaseConfig, "tree-table");
};

/**
 * Normalizes an arbitrary mode string into a valid field database mode.
 */
export const normalizeFieldDatabaseMode = (mode: string): FieldDatabaseMode => {
	switch (mode) {
		case "tree-table":
			return "tree-table";
		case "relation-table":
			return "relation-table";
		default:
			return "column";
	}
};

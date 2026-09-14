import type { FieldTypes } from "../../exports/types.js";
import type BrickBuilder from "../collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { getFieldBuilderState } from "../collection/builders/field-builder/index.js";
import type CustomField from "../collection/custom-fields/custom-field.js";
import fieldConfigs from "../collection/custom-fields/field-configs.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
} from "../collection/custom-fields/storage/index.js";
import prefixGeneratedColName from "../collection/helpers/prefix-generated-column-name.js";
import type {
	CollectionSchemaColumn,
	TableType,
} from "../collection/schema/types.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { RefTarget } from "./types.js";

/**
 * Resolves the custom field instance for a schema-backed field table.
 */
const getRelationTableFieldInstance = (
	collection: CollectionBuilder,
	schema: {
		name: LucidBrickTableName;
		columns: CollectionSchemaColumn[];
		key: {
			collection: string;
			brick?: string;
			fieldPath?: string[];
		};
		type: TableType;
	},
): CustomField<FieldTypes> | null => {
	const databaseConfig = getFieldDatabaseConfig(schema.type);
	if (!databaseConfig || !isStorageMode(databaseConfig, "relation-table")) {
		return null;
	}

	const fieldKey = schema.key.fieldPath?.[schema.key.fieldPath.length - 1];
	if (!fieldKey) return null;

	const owner: CollectionBuilder | BrickBuilder | undefined = schema.key.brick
		? collection.brickInstances.find((brick) => brick.key === schema.key.brick)
		: collection;
	if (!owner) return null;

	return getFieldBuilderState(owner).fields.get(fieldKey) ?? null;
};

/**
 * Checks if the field instance has a multiple flag in the config.
 */
const hasMultipleFlag = (
	fieldInstance: CustomField<FieldTypes>,
): fieldInstance is CustomField<FieldTypes> & {
	config: {
		multiple?: boolean;
	};
} => {
	return (
		typeof fieldInstance.config === "object" &&
		fieldInstance.config !== null &&
		"multiple" in fieldInstance.config
	);
};

/**
 * Prevents single-value relation fields from contributing extra persisted rows to
 * the global ref fetch.
 */
const shouldSkipRelationRow = (
	collection: CollectionBuilder,
	schema: {
		name: LucidBrickTableName;
		columns: CollectionSchemaColumn[];
		key: {
			collection: string;
			brick?: string;
			fieldPath?: string[];
		};
		type: TableType;
	},
	row: Partial<Select<LucidBricksTable>>,
): boolean => {
	const fieldInstance = getRelationTableFieldInstance(collection, schema);
	if (!fieldInstance) return false;

	if (row.position === 0) return false;

	if (!hasMultipleFlag(fieldInstance)) return false;

	return fieldInstance.config.multiple !== true;
};

/** Maps concrete field-table columns to their owning custom-field instance. */
const getColumnFieldInstances = (
	collection: CollectionBuilder,
	schema: {
		key: { brick?: string };
		columns: CollectionSchemaColumn[];
	},
): Map<string, CustomField<FieldTypes>> => {
	const owner: CollectionBuilder | BrickBuilder | undefined = schema.key.brick
		? collection.brickInstances.find((brick) => brick.key === schema.key.brick)
		: collection;
	if (!owner) return new Map();

	const fieldsByColumn = new Map<string, CustomField<FieldTypes>>(
		Array.from(getFieldBuilderState(owner).fields.values()).map((field) => [
			prefixGeneratedColName(field.key),
			field,
		]),
	);
	return new Map(
		schema.columns.flatMap((column) => {
			if (column.source !== "field" || !column.customField) return [];
			const field = fieldsByColumn.get(column.name);
			return field?.type === column.customField.type
				? [[column.name, field] as const]
				: [];
		}),
	);
};

export type StoredFieldTarget = RefTarget & {
	column: string;
	kind: "direct" | "embedded";
};

/** Uses field-owned extraction for both content reads and the reverse index. */
export const createFieldTargetCollector = (
	collection: CollectionBuilder,
	schema: Parameters<typeof getRelationTableFieldInstance>[1],
) => {
	const columns = getColumnFieldInstances(collection, schema);
	const relation = getRelationTableFieldInstance(collection, schema);

	return (row: Partial<Select<LucidBricksTable>>): StoredFieldTarget[] => {
		if (shouldSkipRelationRow(collection, schema, row)) return [];
		const targets: StoredFieldTarget[] = [];

		for (const column of schema.columns) {
			const value = row[column.name];
			if (value === undefined || value === null) continue;

			if (
				column.source === "field" &&
				column.foreignKey &&
				column.customField
			) {
				const config = fieldConfigs[column.customField.type];
				if ("resource" in config && config.resource) {
					targets.push({
						resource: config.resource,
						table: column.foreignKey.table,
						value,
						column: column.name,
						kind: "direct",
					});
				}
			}

			for (const target of columns
				.get(column.name)
				?.getFieldRefTargets(value) ?? []) {
				targets.push({ ...target, column: column.name, kind: "embedded" });
			}
		}

		for (const target of relation?.getRelationFieldRefTargets(row) ?? []) {
			targets.push({ ...target, column: "", kind: "direct" });
		}

		return targets;
	};
};

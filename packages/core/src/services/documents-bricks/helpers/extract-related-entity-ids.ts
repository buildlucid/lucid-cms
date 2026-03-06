import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
} from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	CollectionSchemaColumn,
	TableType,
} from "../../../libs/collection/schema/types.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import type {
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	Select,
	ServiceFn,
} from "../../../types.js";

export type FieldRelationValues = Partial<
	Record<
		FieldTypes,
		Array<{
			table: string;
			values: Set<unknown>;
		}>
	>
>;

/**
 * Resolves the custom field instance for a schema-backed field table.
 */
const getSchemaFieldInstance = (
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

	return owner.fields.get(fieldKey) ?? null;
};

/**
 * Checks if the field instance has a multiple flag in the config.
 */
const hasMultipleFlag = (
	fieldInstance: CustomField<FieldTypes>,
): fieldInstance is CustomField<FieldTypes> & {
	config: {
		config: {
			multiple?: boolean;
		};
	};
} => {
	return (
		typeof fieldInstance.config === "object" &&
		fieldInstance.config !== null &&
		"config" in fieldInstance.config &&
		typeof fieldInstance.config.config === "object" &&
		fieldInstance.config.config !== null &&
		"multiple" in fieldInstance.config.config
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
	row: Select<LucidBricksTable>,
): boolean => {
	const fieldInstance = getSchemaFieldInstance(collection, schema);
	if (!fieldInstance) return false;

	if (row.position === 0) return false;

	if (!hasMultipleFlag(fieldInstance)) return false;

	return fieldInstance.config.config.multiple !== true;
};

/**
 * Adds a relation target to the deduped ref fetch map.
 */
const appendRelationTarget = (
	refData: FieldRelationValues,
	fieldType: FieldTypes,
	target: {
		table: string;
		value: unknown;
	},
) => {
	if (refData[fieldType] === undefined) {
		refData[fieldType] = [];
	}

	let tableEntry = refData[fieldType]?.find(
		(entry) => entry.table === target.table,
	);

	if (!tableEntry) {
		tableEntry = {
			table: target.table,
			values: new Set<unknown>(),
		};
		refData[fieldType]?.push(tableEntry);
	}

	tableEntry.values.add(target.value);
};

/**
 * Extracts any custom field reference data based on the brick schema's foreign key information.
 * Works with arrays of BrickQueryResponse and/or DocumentQueryResponse types.
 * IDs can be used to fetch the data separately.
 */
const extractRelatedEntityIds: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			brickSchema: {
				name: LucidBrickTableName;
				type: TableType;
				key: {
					collection: string;
					brick?: string;
					fieldPath?: string[];
				};
				columns: CollectionSchemaColumn[];
			}[];
			responses: (BrickQueryResponse | DocumentQueryResponse)[];
			/** Pass a Array of custom field types that should have relation data extracted */
			excludeTypes?: FieldTypes[];
		},
	],
	FieldRelationValues
> = async (_, data) => {
	const refData: FieldRelationValues = {};

	for (const response of data.responses) {
		for (const schema of data.brickSchema) {
			const brickRows = response[schema.name];
			if (!brickRows || !Array.isArray(brickRows) || brickRows.length === 0)
				continue;

			const fieldInstance = getSchemaFieldInstance(data.collection, schema);

			for (const row of brickRows) {
				if (shouldSkipRelationRow(data.collection, schema, row)) continue;

				for (const schemaColumn of schema.columns) {
					if (
						schemaColumn.source === "core" ||
						schemaColumn.foreignKey === undefined ||
						schemaColumn.customField === undefined
					) {
						continue;
					}

					const targetColumn = row[schemaColumn.name as keyof LucidBricksTable];
					if (targetColumn === undefined || targetColumn === null) continue;

					const fieldType = schemaColumn.customField.type;
					const tableName = schemaColumn.foreignKey.table;

					if (data.excludeTypes?.includes(fieldType)) continue;

					appendRelationTarget(refData, fieldType, {
						table: tableName,
						value: targetColumn,
					});
				}

				if (!fieldInstance) continue;
				if (data.excludeTypes?.includes(fieldInstance.type)) continue;

				for (const relationTarget of fieldInstance.getRelationFieldRefTargets(
					row,
				)) {
					appendRelationTarget(refData, fieldInstance.type, relationTarget);
				}
			}
		}
	}

	return {
		data: refData,
		error: undefined,
	};
};

export default extractRelatedEntityIds;

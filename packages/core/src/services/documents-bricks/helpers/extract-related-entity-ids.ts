import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
} from "../../../libs/collection/custom-fields/storage/index.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import type {
	CollectionSchemaColumn,
	TableType,
} from "../../../libs/collection/schema/types.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
} from "../../../libs/db/tables/index.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import {
	type FieldTypes,
	fieldTypes,
	type Select,
	type ServiceFn,
} from "../../../types.js";

export type FieldRefValues = Partial<
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

	return owner.fields.get(fieldKey) ?? null;
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
	row: Select<LucidBricksTable>,
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
		Array.from(owner.fields.values()).map((field) => [
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

/**
 * Adds a target to the deduplicated ref fetch map.
 */
const appendRefTarget = (
	refData: FieldRefValues,
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
 * Identifies a document target that points back to the response row currently
 * being hydrated. The caller can reuse the document already in its response.
 */
const isCurrentDocumentTarget = (
	row: Select<LucidBricksTable>,
	target: {
		table: string;
		value: unknown;
	},
) => {
	if (target.value !== row.document_id) return false;

	const tableNameRes = buildTableName(
		"document",
		{ collection: row.collection_key },
		null,
	);
	return !tableNameRes.error && tableNameRes.data.name === target.table;
};

const shouldIncludeFieldType = (
	fieldType: FieldTypes,
	options: {
		includeTypes?: FieldTypes[];
		excludeTypes?: FieldTypes[];
	},
) => {
	if (options.includeTypes !== undefined) {
		return options.includeTypes.includes(fieldType);
	}

	return options.excludeTypes?.includes(fieldType) !== true;
};

/**
 * Extracts custom field reference data from schemas and stored field values.
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
			/** Pass an array of custom field types that should have relation data extracted. */
			includeTypes?: FieldTypes[];
			/** Includes ref targets discovered inside column-backed custom-field values. */
			includeFieldValueRefTargets?: boolean;
			/** Pass a Array of custom field types that should have relation data extracted */
			excludeTypes?: FieldTypes[];
		},
	],
	FieldRefValues
> = async (_, data) => {
	const refData: FieldRefValues = {};
	const columnFieldInstances = new Map(
		data.brickSchema.map((schema) => [
			schema.name,
			getColumnFieldInstances(data.collection, schema),
		]),
	);

	for (const response of data.responses) {
		for (const schema of data.brickSchema) {
			const brickRows = response[schema.name];
			if (!brickRows || !Array.isArray(brickRows) || brickRows.length === 0)
				continue;

			const fieldInstance = getRelationTableFieldInstance(
				data.collection,
				schema,
			);

			for (const row of brickRows) {
				if (shouldSkipRelationRow(data.collection, schema, row)) continue;

				for (const schemaColumn of schema.columns) {
					const targetColumn = row[schemaColumn.name as keyof LucidBricksTable];
					if (targetColumn === undefined || targetColumn === null) continue;

					if (
						schemaColumn.source === "field" &&
						schemaColumn.foreignKey !== undefined &&
						schemaColumn.customField !== undefined
					) {
						const fieldType = schemaColumn.customField.type;
						if (
							shouldIncludeFieldType(fieldType, {
								includeTypes: data.includeTypes,
								excludeTypes: data.excludeTypes,
							})
						) {
							appendRefTarget(refData, fieldType, {
								table: schemaColumn.foreignKey.table,
								value: targetColumn,
							});
						}
					}

					const columnFieldInstance = columnFieldInstances
						.get(schema.name)
						?.get(schemaColumn.name);
					if (!columnFieldInstance) continue;

					const fieldRefTargets =
						columnFieldInstance.getFieldRefTargets(targetColumn);
					for (const targetFieldType of fieldTypes) {
						const targets = fieldRefTargets[targetFieldType];
						if (!targets) continue;
						if (
							!shouldIncludeFieldType(targetFieldType, {
								includeTypes: data.includeFieldValueRefTargets
									? undefined
									: data.includeTypes,
								excludeTypes: data.excludeTypes,
							})
						) {
							continue;
						}

						for (const target of targets) {
							if (
								targetFieldType === "relation" &&
								isCurrentDocumentTarget(row, target)
							) {
								continue;
							}
							appendRefTarget(refData, targetFieldType, target);
						}
					}
				}

				if (!fieldInstance) continue;
				if (
					!shouldIncludeFieldType(fieldInstance.type, {
						includeTypes: data.includeTypes,
						excludeTypes: data.excludeTypes,
					})
				) {
					continue;
				}

				for (const relationTarget of fieldInstance.getRelationFieldRefTargets(
					row,
				)) {
					appendRefTarget(refData, fieldInstance.type, relationTarget);
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

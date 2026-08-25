import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import fieldConfigs from "../../../libs/collection/custom-fields/field-configs.js";
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
import {
	addRefTarget,
	shouldIncludeRefResource,
} from "../../../libs/refs/targets.js";
import type { RefTargets } from "../../../libs/refs/types.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import type {
	FieldTypes,
	RefResource,
	Select,
	ServiceFn,
} from "../../../types.js";

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

/**
 * Collects resource targets from relation storage and embedded field values.
 * The caller controls direct relation resources, while embedded targets are
 * always collected because fields may need them while formatting their values.
 */
const collectRefTargets: ServiceFn<
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
			/** Direct relation resources requested for the public response. */
			resources?: RefResource[];
		},
	],
	RefTargets
> = async (_, data) => {
	const targets: RefTargets = {};
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
						const fieldConfig = fieldConfigs[fieldType];
						const resource =
							"resource" in fieldConfig ? fieldConfig.resource : undefined;
						if (
							resource &&
							shouldIncludeRefResource(resource, data.resources)
						) {
							addRefTarget(targets, {
								resource,
								table: schemaColumn.foreignKey.table,
								value: targetColumn,
							});
						}
					}

					const columnFieldInstance = columnFieldInstances
						.get(schema.name)
						?.get(schemaColumn.name);
					if (!columnFieldInstance) continue;

					for (const target of columnFieldInstance.getFieldRefTargets(
						targetColumn,
					)) {
						if (
							target.resource === "documents" &&
							isCurrentDocumentTarget(row, target)
						) {
							continue;
						}
						addRefTarget(targets, target);
					}
				}

				if (!fieldInstance) continue;
				for (const relationTarget of fieldInstance.getRelationFieldRefTargets(
					row,
				)) {
					if (
						shouldIncludeRefResource(relationTarget.resource, data.resources)
					) {
						addRefTarget(targets, relationTarget);
					}
				}
			}
		}
	}

	return {
		data: targets,
		error: undefined,
	};
};

export default collectRefTargets;

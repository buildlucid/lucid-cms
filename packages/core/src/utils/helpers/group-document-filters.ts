import { getFieldDatabaseConfig } from "../../libs/collection/custom-fields/storage/index.js";
import prefixGeneratedColName from "../../libs/collection/helpers/prefix-generated-column-name.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type {
	FilterOperator,
	FilterValue,
	QueryParamFilters,
} from "../../types/query-params.js";
import type { FieldDatabaseMode, LucidBrickTableName } from "../../types.js";

const CUSTOMFIELD_FILTER_PREFIX = "_";
const DOCUMENT_FIELDS_KEY = "fields";
const BRICK_SEPERATOR = ".";
const TREE_TABLE_FILTER_MODE: FieldDatabaseMode = "tree-table";

export type BrickFieldFilters = {
	key: string;
	value: FilterValue;
	operator: FilterOperator;
	column: `_${string}`;
};

export type BrickFilters = {
	table: LucidBrickTableName;
	filters: BrickFieldFilters[];
};

const hasFieldColumn = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
	fieldKey: string,
): boolean => {
	const prefixedColName = prefixGeneratedColName(fieldKey);
	return schema.columns.some(
		(column) => column.name === prefixedColName && column.source === "field",
	);
};

const pushBrickFilter = (params: {
	brickFiltersMap: Map<LucidBrickTableName, BrickFieldFilters[]>;
	table: LucidBrickTableName;
	fieldKey: string;
	value: FilterValue;
	operator?: FilterOperator;
}): void => {
	const filters = params.brickFiltersMap.get(params.table) || [];
	filters.push({
		key: params.fieldKey,
		value: params.value,
		operator: params.operator || "=",
		column: prefixGeneratedColName(params.fieldKey),
	});
	params.brickFiltersMap.set(params.table, filters);
};

const matchesStorageMode = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
	mode: FieldDatabaseMode,
): boolean => {
	const databaseConfig = getFieldDatabaseConfig(schema.type);
	return databaseConfig?.mode === mode;
};

/**
 * Splits filters based on document columns and brick tables for custom fields.
 *
 * - `filter[_customFieldKey]` Targets the `document-fields` table and checks for a CF with a key of `customFieldKey`.
 * - `filter[fields._customFieldKey]` Targets the `document-fiedls` table and checks for a CF with a key of `customFieldKey`.
 * - `filter[brickKey._customFieldKey]` Targets the `brick` table with a key of `brickKey` and checks for a CF with a key of `customFieldKey`.
 * - `filter[brickKey.treeFieldKey._customFieldKey]` Targets a tree-table custom-field table scoped to the `brick` and checks for a CF with a key of `customFieldKey`.
 *
 * This supports filtering on any tree-table depth. Include the tree field key for the target table path segment.
 */
const groupDocumentFilters = (
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[],
	filters?: QueryParamFilters,
): {
	documentFilters: QueryParamFilters;
	brickFilters: BrickFilters[];
} => {
	if (!filters) return { documentFilters: {}, brickFilters: [] };

	const validDocFilters = [
		"id",
		"createdBy",
		"updatedBy",
		"createdAt",
		"updatedAt",
		"isDeleted",
		"deletedBy",
	];

	const documentFilters: QueryParamFilters = {};
	const brickFiltersMap = new Map<LucidBrickTableName, BrickFieldFilters[]>();

	for (const [key, value] of Object.entries(filters)) {
		//* handle document core filters
		if (validDocFilters.includes(key)) {
			documentFilters[key] = value;
			continue;
		}

		//* handle document custom fields (prefixed with _)
		if (key.startsWith(CUSTOMFIELD_FILTER_PREFIX)) {
			const fieldKey = key.substring(1);
			const fieldTable = bricksTableSchema.find(
				(schema) => schema.type === "document-fields",
			);
			if (fieldTable && hasFieldColumn(fieldTable, fieldKey)) {
				pushBrickFilter({
					brickFiltersMap,
					table: fieldTable.name,
					fieldKey,
					value: value.value,
					operator: value.operator,
				});
			}
			continue;
		}

		//* handle brick fields and tree-table fields (format: "brickKey.fieldKey" or "brickKey.treeFieldKey._fieldKey")
		const parts = key.split(BRICK_SEPERATOR);
		if (parts.length >= 2) {
			const brickKey = parts[0];
			let tableName: LucidBrickTableName | null = null;
			let fieldKey: string | null = null;
			let schemaTable = null;

			if (
				parts.length === 2 &&
				parts[1]?.startsWith(CUSTOMFIELD_FILTER_PREFIX)
			) {
				// direct brick field ("hero._title")
				fieldKey = parts[1].substring(1);

				// handl "fields" as brickKey (document-fields)
				if (brickKey === DOCUMENT_FIELDS_KEY) {
					schemaTable = bricksTableSchema.find(
						(schema) => schema.type === "document-fields",
					);
				} else {
					schemaTable = bricksTableSchema.find(
						(schema) =>
							schema.type === "brick" && schema.key.brick === brickKey,
					);
				}

				if (schemaTable) tableName = schemaTable.name;
			} else if (
				parts.length === 3 &&
				parts[2]?.startsWith(CUSTOMFIELD_FILTER_PREFIX)
			) {
				// tree-table field ("hero.items._text", "fields.people._name")
				const treeFieldKey = parts[1];
				fieldKey = parts[2].substring(1);

				if (treeFieldKey) {
					// handle document-fields tree tables vs brick-scoped tree tables
					if (brickKey === DOCUMENT_FIELDS_KEY) {
						schemaTable = bricksTableSchema.find(
							(schema) =>
								matchesStorageMode(schema, TREE_TABLE_FILTER_MODE) &&
								schema.key.brick === undefined &&
								schema.key.fieldPath?.includes(treeFieldKey),
						);
					} else {
						schemaTable = bricksTableSchema.find(
							(schema) =>
								matchesStorageMode(schema, TREE_TABLE_FILTER_MODE) &&
								schema.key.brick === brickKey &&
								schema.key.fieldPath?.includes(treeFieldKey),
						);
					}

					if (schemaTable) tableName = schemaTable.name;
				}
			}

			if (
				tableName &&
				fieldKey &&
				schemaTable &&
				hasFieldColumn(schemaTable, fieldKey)
			) {
				pushBrickFilter({
					brickFiltersMap,
					table: tableName,
					fieldKey,
					value: value.value,
					operator: value.operator,
				});
			}
		}
	}

	return {
		documentFilters,
		brickFilters: Array.from(brickFiltersMap.entries()).map(
			([table, filters]) => ({ table, filters }),
		),
	};
};

export default groupDocumentFilters;

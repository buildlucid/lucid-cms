import prefixGeneratedColName from "../../libs/collection/helpers/prefix-generated-column-name.js";
import type {
	FilterOperator,
	FilterValue,
	QueryParamFilters,
} from "../../types/query-params.js";
import type { LucidBrickTableName } from "../../types.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";

const CUSTOMFIELD_FILTER_PREFIX = "_";
const DOCUMENT_FIELDS_KEY = "fields";
const BRICK_SEPERATOR = ".";

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

/**
 * Splits filters based on document columns and brick tables for custom fields.
 *
 * - `filter[_customFieldKey]` Targets the `document-fields` table and checks for a CF with a key of `customFieldKey`.
 * - `filter[fields._customFieldKey]` Targets the `document-fiedls` table and checks for a CF with a key of `customFieldKey`.
 * - `filter[brickKey._customFieldKey]` Targets the `brick` table with a key of `brickKey` and checks for a CF with a key of `customFieldKey`.
 * - `filter[brickKey.repeaterKey._customFieldKey]` Targets the `repeater` table that belongs to the `brick` and checks for a CF with a key of `customFieldKey`.
 *
 * This supports filtering on any repeater table, but you only need to include the repeater key of the level you're searching. This works as repeater keys within a brick are strictly unique.
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

			if (fieldTable) {
				// Validate the field exists in the schema
				const prefixedColName = prefixGeneratedColName(fieldKey);
				const column = fieldTable.columns.find(
					(col) => col.name === prefixedColName && col.source === "field",
				);

				if (column) {
					const filters = brickFiltersMap.get(fieldTable.name) || [];
					filters.push({
						key: fieldKey,
						value: value.value,
						operator: value.operator || "=",
						column: prefixedColName,
					});
					brickFiltersMap.set(fieldTable.name, filters);
				}
			}
			continue;
		}

		//* handle brick fields and repeaters (format: "brickKey.fieldKey" or "brickKey.repeaterKey._fieldKey")
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
				// repeater field ("hero.items._text", "fields.people._name")
				const repeaterKey = parts[1];
				fieldKey = parts[2].substring(1);

				if (repeaterKey) {
					// handle document fields repeaters v brick repeaters
					if (brickKey === DOCUMENT_FIELDS_KEY) {
						schemaTable = bricksTableSchema.find(
							(schema) =>
								schema.type === "repeater" &&
								schema.key.brick === undefined &&
								schema.key.repeater?.includes(repeaterKey),
						);
					} else {
						schemaTable = bricksTableSchema.find(
							(schema) =>
								schema.type === "repeater" &&
								schema.key.brick === brickKey &&
								schema.key.repeater?.includes(repeaterKey),
						);
					}

					if (schemaTable) tableName = schemaTable.name;
				}
			}

			if (tableName && fieldKey && schemaTable) {
				const prefixedColName = prefixGeneratedColName(fieldKey);
				const columnExists = schemaTable.columns.some(
					(col) => col.name === prefixedColName && col.source === "field",
				);

				if (columnExists) {
					const filters = brickFiltersMap.get(tableName) || [];
					filters.push({
						key: fieldKey,
						value: value.value,
						operator: value.operator || "=",
						column: prefixedColName,
					});
					brickFiltersMap.set(tableName, filters);
				}
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

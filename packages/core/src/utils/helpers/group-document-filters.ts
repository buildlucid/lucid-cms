import type { DocumentEnvironmentStatus } from "@lucidcms/types";
import { fieldHooks } from "../../libs/collection/custom-fields/registered-fields.js";
import { getFieldDatabaseConfig } from "../../libs/collection/custom-fields/storage/index.js";
import type { FieldDatabaseMode } from "../../libs/collection/custom-fields/types.js";
import prefixGeneratedColName from "../../libs/collection/helpers/prefix-generated-column-name.js";
import type {
	CollectionSchemaColumn,
	CollectionSchemaTable,
} from "../../libs/collection/schema/types.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../libs/db/tables/index.js";
import type {
	FilterOperator,
	FilterValue,
	QueryParamFilterCondition,
	QueryParamFilters,
} from "../../types/query-params.js";
import parseDocumentRefValue from "./parse-document-ref-value.js";

const GENERATED_COLUMN_PREFIX = "_";
const FILTER_KEY_SEPARATOR = ".";
const DOCUMENT_FIELDS_KEY = "fields";
const BRICKS_KEY = "bricks";
const RELATION_TABLE_FILTER_MODE: FieldDatabaseMode = "relation-table";
const ENVIRONMENT_STATUS_FILTER_PREFIX = "envStatus.";

const environmentStatuses = new Set<DocumentEnvironmentStatus>([
	"unpublished",
	"out-of-sync",
	"in-sync",
]);

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

export type DocumentEnvironmentStatusFilter = {
	environmentKey: string;
	status: DocumentEnvironmentStatus;
};

/** Pre-resolved tables and conditions for filtering through one relation field. */
export type RelationDocumentFilter = {
	relation: {
		table: LucidBrickTableName;
		collectionKeyColumn: `_${string}`;
		documentIdColumn: `_${string}`;
	};
	target: {
		collectionKey: string;
		versionType: Exclude<DocumentVersionType, "revision">;
		tables: {
			document: LucidDocumentTableName;
			versions: LucidVersionTableName;
		};
		documentFilters: QueryParamFilterCondition[];
		brickFilters: BrickFilters[];
	};
};

export type DocumentFilterGroup = {
	documentFilters: QueryParamFilterCondition[];
	brickFilters: BrickFilters[];
	environmentStatusFilters: DocumentEnvironmentStatusFilter[];
	relationDocumentFilters: RelationDocumentFilter[];
};

type DocumentFilterEntry = {
	key: string;
	value: QueryParamFilterCondition["value"];
	operator?: QueryParamFilterCondition["operator"];
};

type DocumentFilterGroupingOptions = {
	includeWorkflow?: boolean;
	environmentKeys?: ReadonlySet<string>;
	relationCollectionDefaults?: ReadonlyMap<string, string>;
	/** Keys handled elsewhere, such as relation traversal filters. */
	handledKeys?: ReadonlySet<string>;
};

const getFieldColumn = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
	fieldKey: string,
): CollectionSchemaColumn | undefined => {
	const prefixedColName = prefixGeneratedColName(fieldKey);
	return schema.columns.find(
		(column) => column.name === prefixedColName && column.source === "field",
	);
};

const isPrefixedFieldColumn = (column: string): column is `_${string}` => {
	return column.startsWith(GENERATED_COLUMN_PREFIX);
};

const getRelationFilterColumn = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
): (CollectionSchemaColumn & { name: `_${string}` }) | null => {
	const fieldColumns = schema.columns.filter(
		(column): column is CollectionSchemaColumn & { name: `_${string}` } =>
			column.source === "field" && isPrefixedFieldColumn(column.name),
	);

	return (
		fieldColumns.find(
			(column) => column.name === prefixGeneratedColName("document_id"),
		) ??
		fieldColumns[0] ??
		null
	);
};

/** Relation custom-field tables also store the target's collection key. */
const getRelationCollectionKeyColumn = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
): (CollectionSchemaColumn & { name: `_${string}` }) | null => {
	return (
		schema.columns.find(
			(column): column is CollectionSchemaColumn & { name: `_${string}` } =>
				column.source === "field" &&
				column.name === prefixGeneratedColName("collection_key"),
		) ?? null
	);
};

const getRelationTableFilterColumn = (params: {
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[];
	brickKey?: string;
	fieldKey: string;
}): {
	table: LucidBrickTableName;
	column: `_${string}`;
	schemaColumn: CollectionSchemaColumn;
	collectionKeyColumn: (CollectionSchemaColumn & { name: `_${string}` }) | null;
} | null => {
	const relationTable = params.bricksTableSchema.find((schema) => {
		const fieldPath = schema.key.fieldPath;

		return (
			matchesStorageMode(schema, RELATION_TABLE_FILTER_MODE) &&
			schema.key.brick === params.brickKey &&
			fieldPath !== undefined &&
			fieldPath[fieldPath.length - 1] === params.fieldKey
		);
	});
	if (!relationTable) return null;

	const column = getRelationFilterColumn(relationTable);
	if (!column) return null;

	return {
		table: relationTable.name,
		column: column.name,
		schemaColumn: column,
		collectionKeyColumn: getRelationCollectionKeyColumn(relationTable),
	};
};

/**
 * Pushes relation-table filters, using an explicit `collectionKey:id` value or
 * the relation field's configured default collection. Filters for one table
 * share a single EXISTS subquery, so both conditions apply to the same row.
 * The filter's operator applies to the document id - the collection key is
 * always matched with `=`, so `!=` means "related to another document of
 * that collection".
 */
const pushRelationTableFilter = (params: {
	brickFiltersMap: Map<LucidBrickTableName, BrickFieldFilters[]>;
	relationTableFilter: NonNullable<
		ReturnType<typeof getRelationTableFilterColumn>
	>;
	fieldKey: string;
	value: FilterValue;
	operator?: FilterOperator;
	defaultCollectionKey?: string;
}): void => {
	const { relationTableFilter } = params;
	const compound = parseDocumentRefValue(params.value);
	const collectionKey = compound?.collectionKey ?? params.defaultCollectionKey;
	const documentId = relationTableFilter.collectionKeyColumn
		? (compound?.documentId ?? params.value)
		: params.value;

	if (collectionKey && relationTableFilter.collectionKeyColumn) {
		pushBrickFilter({
			brickFiltersMap: params.brickFiltersMap,
			table: relationTableFilter.table,
			fieldKey: params.fieldKey,
			value: collectionKey,
			operator: "=",
			column: relationTableFilter.collectionKeyColumn.name,
			schemaColumn: relationTableFilter.collectionKeyColumn,
		});
	}

	pushBrickFilter({
		brickFiltersMap: params.brickFiltersMap,
		table: relationTableFilter.table,
		fieldKey: params.fieldKey,
		value: documentId,
		operator: params.operator,
		column: relationTableFilter.column,
		schemaColumn: relationTableFilter.schemaColumn,
	});
};

const pushBrickFilter = (params: {
	brickFiltersMap: Map<LucidBrickTableName, BrickFieldFilters[]>;
	table: LucidBrickTableName;
	fieldKey: string;
	value: FilterValue;
	operator?: FilterOperator;
	column?: `_${string}`;
	schemaColumn?: CollectionSchemaColumn;
}): void => {
	const filters = params.brickFiltersMap.get(params.table) || [];
	filters.push({
		key: params.fieldKey,
		value: formatFieldFilterValue({
			value: params.value,
			operator: params.operator,
			schemaColumn: params.schemaColumn,
		}),
		operator: params.operator || (Array.isArray(params.value) ? "in" : "="),
		column: params.column ?? prefixGeneratedColName(params.fieldKey),
	});
	params.brickFiltersMap.set(params.table, filters);
};

/** Delegates field-specific filter coercion to the registered custom field. */
const formatFieldFilterValue = (params: {
	value: FilterValue;
	operator?: FilterOperator;
	schemaColumn?: CollectionSchemaColumn;
}): FilterValue => {
	const fieldType = params.schemaColumn?.customField?.type;
	if (!fieldType || !params.schemaColumn) return params.value;

	const fieldDefinition = fieldHooks[fieldType];
	if (!fieldDefinition.formatFilterValue) return params.value;

	//* formatters return null deliberately for invalid input so the filter
	//* matches no rows - it must not fall back to the raw value
	return fieldDefinition.formatFilterValue({
		value: params.value,
		operator: params.operator,
		column: params.schemaColumn,
	});
};

const matchesStorageMode = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
	mode: FieldDatabaseMode,
): boolean => {
	const databaseConfig = getFieldDatabaseConfig(schema.type);
	return databaseConfig?.mode === mode;
};

/** Parses `fields.<field>` and `bricks.<brick>.<field>` filter keys. */
const parseFieldFilterKey = (
	key: string,
): { brickKey: string | undefined; fieldKey: string } | null => {
	const parts = key.split(FILTER_KEY_SEPARATOR);
	if (parts[0] === DOCUMENT_FIELDS_KEY && parts.length === 2 && parts[1]) {
		return { brickKey: undefined, fieldKey: parts[1] };
	}
	if (parts[0] === BRICKS_KEY && parts.length === 3 && parts[1] && parts[2]) {
		return { brickKey: parts[1], fieldKey: parts[2] };
	}
	return null;
};

/**
 * Groups document columns, `fields.<key>` and `bricks.<brick>.<key>` by storage table. Repeater
 * fields use the same paths because keys are unique within a collection or brick. Returns
 * unmatched keys in `unknownKeys` for callers to reject.
 */
const groupDocumentFilterEntries = (
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[],
	filters: DocumentFilterEntry[],
	options?: DocumentFilterGroupingOptions,
): {
	documentFilters: QueryParamFilterCondition[];
	brickFilters: BrickFilters[];
	environmentStatusFilters: DocumentEnvironmentStatusFilter[];
	unknownKeys: string[];
} => {
	const validDocFilters = [
		"id",
		"createdBy",
		"updatedBy",
		"createdAt",
		"updatedAt",
		"isDeleted",
		"deletedBy",
	];
	if (options?.includeWorkflow === true) {
		validDocFilters.push("workflowStage", "workflowAssignee");
	}

	const documentFilters: QueryParamFilterCondition[] = [];
	const brickFiltersMap = new Map<LucidBrickTableName, BrickFieldFilters[]>();
	const environmentStatusFilters: DocumentEnvironmentStatusFilter[] = [];
	const unknownKeys: string[] = [];

	for (const filter of filters) {
		const { key, value, operator } = filter;
		if (options?.handledKeys?.has(key)) continue;

		if (key.startsWith(ENVIRONMENT_STATUS_FILTER_PREFIX)) {
			const environmentKey = key.slice(ENVIRONMENT_STATUS_FILTER_PREFIX.length);
			if (
				options?.environmentKeys?.has(environmentKey) &&
				typeof value === "string" &&
				environmentStatuses.has(value as DocumentEnvironmentStatus) &&
				(operator === undefined || operator === "=")
			) {
				environmentStatusFilters.push({
					environmentKey,
					status: value as DocumentEnvironmentStatus,
				});
			} else {
				unknownKeys.push(key);
			}
			continue;
		}

		//* handle document core filters
		if (validDocFilters.includes(key)) {
			documentFilters.push({
				key,
				value,
				operator,
			});
			continue;
		}

		//* handle custom fields on the collection or one of its bricks
		const fieldFilter = parseFieldFilterKey(key);
		if (!fieldFilter) {
			unknownKeys.push(key);
			continue;
		}
		const { brickKey, fieldKey } = fieldFilter;

		let fieldColumn: CollectionSchemaColumn | undefined;
		const fieldTable = bricksTableSchema.find((schema) => {
			if (schema.key.brick !== brickKey) return false;
			if (matchesStorageMode(schema, RELATION_TABLE_FILTER_MODE)) return false;
			fieldColumn = getFieldColumn(schema, fieldKey);
			return fieldColumn !== undefined;
		});
		if (fieldTable && fieldColumn) {
			pushBrickFilter({
				brickFiltersMap,
				table: fieldTable.name,
				fieldKey,
				value,
				operator,
				schemaColumn: fieldColumn,
			});
			continue;
		}

		const relationTableFilter = getRelationTableFilterColumn({
			bricksTableSchema,
			brickKey,
			fieldKey,
		});
		if (relationTableFilter) {
			pushRelationTableFilter({
				brickFiltersMap,
				relationTableFilter,
				fieldKey,
				value,
				operator,
				defaultCollectionKey: options?.relationCollectionDefaults?.get(key),
			});
			continue;
		}

		unknownKeys.push(key);
	}

	return {
		documentFilters,
		environmentStatusFilters,
		unknownKeys,
		brickFilters: Array.from(brickFiltersMap.entries()).map(
			([table, filters]) => ({ table, filters }),
		),
	};
};

const groupDocumentFilters = (
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[],
	filters?: QueryParamFilters,
	options?: DocumentFilterGroupingOptions,
): {
	documentFilters: QueryParamFilters;
	brickFilters: BrickFilters[];
	environmentStatusFilters: DocumentEnvironmentStatusFilter[];
	unknownKeys: string[];
} => {
	if (!filters) {
		return {
			documentFilters: {},
			brickFilters: [],
			environmentStatusFilters: [],
			unknownKeys: [],
		};
	}

	const grouped = groupDocumentFilterEntries(
		bricksTableSchema,
		Object.entries(filters).map(([key, value]) => ({
			key,
			value: value.value,
			operator: value.operator,
		})),
		options,
	);

	return {
		documentFilters: Object.fromEntries(
			grouped.documentFilters.map(({ key, ...filter }) => [key, filter]),
		),
		brickFilters: grouped.brickFilters,
		environmentStatusFilters: grouped.environmentStatusFilters,
		unknownKeys: grouped.unknownKeys,
	};
};

/** Splits ordered filter conditions without losing keys needed for OR groups. */
export const groupDocumentFilterConditions = (
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[],
	filters?: QueryParamFilterCondition[],
	options?: DocumentFilterGroupingOptions,
): {
	documentFilters: QueryParamFilterCondition[];
	brickFilters: BrickFilters[];
	environmentStatusFilters: DocumentEnvironmentStatusFilter[];
	unknownKeys: string[];
} => {
	if (!filters) {
		return {
			documentFilters: [],
			brickFilters: [],
			environmentStatusFilters: [],
			unknownKeys: [],
		};
	}

	return groupDocumentFilterEntries(bricksTableSchema, filters, options);
};

export default groupDocumentFilters;

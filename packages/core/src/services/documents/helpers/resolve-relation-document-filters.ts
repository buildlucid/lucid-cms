import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { normalizeRelationCollections } from "../../../libs/collection/custom-fields/fields/relation/utils/normalize-relation-collections.js";
import type { FieldRefVersionTypeResolver } from "../../../libs/collection/custom-fields/utils/ref-fetch.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import primeRuntimeSchemas from "../../../libs/collection/schema/runtime/prime-runtime-schemas.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type {
	CollectionSchemaColumn,
	CollectionSchemaTable,
} from "../../../libs/collection/schema/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionClientScope } from "../../../libs/permission/client-scopes.js";
import type {
	QueryParamFilterCondition,
	QueryParamFilterGroups,
	QueryParamFilters,
} from "../../../types/query-params.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
} from "../../../types.js";
import {
	groupDocumentFilterConditions,
	type RelationDocumentFilter,
} from "../../../utils/helpers/group-document-filters.js";
import type {
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";

type RelationFilterDescriptor = {
	path: string;
	targetCollectionKeys: string[];
	relation: RelationDocumentFilter["relation"];
};

export type PendingRelationDocumentFilter = {
	targetCollectionKey: string;
	relation: RelationDocumentFilter["relation"];
	conditions: QueryParamFilterCondition[];
};

type RelationDocumentFilterPlan = {
	filters: RelationDocumentFilter[];
	filterOr: RelationDocumentFilter[][];
	relationCollectionDefaults: ReadonlyMap<string, string>;
};

type ResolvedRelationFilterTarget = {
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[];
	tables: RelationDocumentFilter["target"]["tables"];
	versionType: RelationDocumentFilter["target"]["versionType"];
	relationCollectionDefaults: ReadonlyMap<string, string>;
};

const fieldFilterSegment = (fieldKey: string): string =>
	fieldKey.startsWith("_") ? fieldKey : prefixGeneratedColName(fieldKey);

const isPrefixedFieldColumn = (
	column: CollectionSchemaColumn,
): column is CollectionSchemaColumn & { name: `_${string}` } =>
	column.source === "field" && column.name.startsWith("_");

const collectionBricks = (collection: CollectionBuilder) => [
	...(collection.config.bricks?.fixed ?? []),
	...(collection.config.bricks?.builder ?? []),
];

/** Builds the public filter path for a relation table from its runtime scope. */
const relationFilterPath = (
	schema: CollectionSchemaTable<LucidBrickTableName>,
	fieldKey: string,
	nearestTreeField: string | null,
): string => {
	const fieldSegment = fieldFilterSegment(fieldKey);

	if (schema.key.brick) {
		return [schema.key.brick, nearestTreeField, fieldSegment]
			.filter((part): part is string => Boolean(part))
			.join(".");
	}
	if (nearestTreeField) {
		return ["fields", nearestTreeField, fieldSegment].join(".");
	}
	return fieldSegment;
};

/** Resolves relation field paths and allowed target collections from source config. */
const relationFilterDescriptors = (
	collection: CollectionBuilder,
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[],
): RelationFilterDescriptor[] => {
	const bricks = collectionBricks(collection);
	const descriptors: RelationFilterDescriptor[] = [];

	for (const schema of bricksTableSchema) {
		const fieldPath = schema.key.fieldPath;
		const fieldKey = fieldPath?.[fieldPath.length - 1];
		if (!fieldKey) continue;

		const builder = schema.key.brick
			? bricks.find((brick) => brick.key === schema.key.brick)
			: collection;
		const field = builder?.fields.get(fieldKey);
		if (field?.config.type !== "relation") continue;

		const collectionKeyColumn = schema.columns.find(
			(column): column is CollectionSchemaColumn & { name: `_${string}` } =>
				isPrefixedFieldColumn(column) &&
				column.name === prefixGeneratedColName("collection_key"),
		);
		const documentIdColumn = schema.columns.find(
			(column): column is CollectionSchemaColumn & { name: `_${string}` } =>
				isPrefixedFieldColumn(column) &&
				column.name === prefixGeneratedColName("document_id"),
		);
		if (!collectionKeyColumn || !documentIdColumn) {
			continue;
		}

		descriptors.push({
			path: relationFilterPath(schema, fieldKey, field.treeParent),
			targetCollectionKeys: normalizeRelationCollections(
				field.config.collection,
			),
			relation: {
				table: schema.name,
				collectionKeyColumn: collectionKeyColumn.name,
				documentIdColumn: documentIdColumn.name,
			},
		});
	}

	return descriptors.sort(
		(left, right) => right.path.length - left.path.length,
	);
};

const collectionDefaultsFromDescriptors = (
	descriptors: RelationFilterDescriptor[],
): ReadonlyMap<string, string> =>
	new Map(
		descriptors.flatMap((descriptor) => {
			const defaultCollectionKey = descriptor.targetCollectionKeys[0];
			return defaultCollectionKey
				? ([[descriptor.path, defaultCollectionKey]] as const)
				: [];
		}),
	);

const groupConditions = (
	descriptors: RelationFilterDescriptor[],
	conditions?: QueryParamFilterCondition[],
): PendingRelationDocumentFilter[] => {
	if (!conditions || conditions.length === 0) return [];
	const grouped = new Map<string, PendingRelationDocumentFilter>();

	for (const condition of conditions) {
		for (const descriptor of descriptors) {
			const prefix = `${descriptor.path}.`;
			if (!condition.key.startsWith(prefix)) continue;

			const traversal = condition.key.slice(prefix.length);
			const separatorIndex = traversal.indexOf(".");
			const possibleCollectionKey = traversal.slice(
				0,
				separatorIndex === -1 ? undefined : separatorIndex,
			);
			// Explicit collection segments win; unqualified paths use the first configured target.
			const hasExplicitCollection =
				separatorIndex !== -1 &&
				descriptor.targetCollectionKeys.includes(possibleCollectionKey);
			const targetCollectionKey = hasExplicitCollection
				? possibleCollectionKey
				: descriptor.targetCollectionKeys[0];
			const targetFilterKey = hasExplicitCollection
				? traversal.slice(separatorIndex + 1)
				: traversal;
			if (!targetCollectionKey || !targetFilterKey) break;

			const groupKey = `${descriptor.relation.table}:${targetCollectionKey}`;
			const pending = grouped.get(groupKey) ?? {
				targetCollectionKey,
				relation: descriptor.relation,
				conditions: [],
			};
			pending.conditions.push({
				...condition,
				key: targetFilterKey,
			});
			grouped.set(groupKey, pending);
			break;
		}
	}

	return Array.from(grouped.values());
};

/** Groups traversal conditions that must match the same related document. */
export const groupRelationDocumentFilterConditions = (props: {
	collection: CollectionBuilder;
	bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[];
	conditions?: QueryParamFilterCondition[];
}): PendingRelationDocumentFilter[] =>
	groupConditions(
		relationFilterDescriptors(props.collection, props.bricksTableSchema),
		props.conditions,
	);

const filterConditions = (
	filters?: QueryParamFilters,
): QueryParamFilterCondition[] | undefined =>
	filters
		? Object.entries(filters).map(([key, filter]) => ({ key, ...filter }))
		: undefined;

const buildResolvedFilters = (props: {
	pending: PendingRelationDocumentFilter[];
	targets: Map<string, ResolvedRelationFilterTarget>;
}): RelationDocumentFilter[] =>
	props.pending.flatMap((pending) => {
		const target = props.targets.get(pending.targetCollectionKey);
		if (!target) return [];

		const grouped = groupDocumentFilterConditions(
			target.bricksTableSchema,
			pending.conditions,
			{
				relationCollectionDefaults: target.relationCollectionDefaults,
			},
		);
		if (
			grouped.documentFilters.length === 0 &&
			grouped.brickFilters.length === 0
		) {
			return [];
		}

		return [
			{
				relation: pending.relation,
				target: {
					collectionKey: pending.targetCollectionKey,
					versionType: target.versionType,
					tables: target.tables,
					documentFilters: grouped.documentFilters,
					brickFilters: grouped.brickFilters,
				},
			},
		];
	});

/**
 * Resolves one-hop relation traversal filters into repository-ready table plans.
 * Target schemas are primed once per request and reused across AND/OR groups.
 */
const resolveRelationDocumentFilters: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			bricksTableSchema: CollectionSchemaTable<LucidBrickTableName>[];
			filter?: QueryParamFilters;
			filterOr?: QueryParamFilterGroups;
			relationVersionType: Exclude<DocumentVersionType, "revision">;
			resolveVersionType?: FieldRefVersionTypeResolver;
			allowedCollectionKeys?: string[];
		},
	],
	RelationDocumentFilterPlan
> = async (context, data): ServiceResponse<RelationDocumentFilterPlan> => {
	const descriptors = relationFilterDescriptors(
		data.collection,
		data.bricksTableSchema,
	);
	const relationCollectionDefaults =
		collectionDefaultsFromDescriptors(descriptors);
	const filters = groupConditions(descriptors, filterConditions(data.filter));
	const filterOr = (data.filterOr ?? []).map((conditions) =>
		groupConditions(descriptors, conditions),
	);
	const pending = [...filters, ...filterOr.flat()];
	const targetCollectionKeys = Array.from(
		new Set(pending.map((filter) => filter.targetCollectionKey)),
	);
	if (data.allowedCollectionKeys !== undefined) {
		const allowedCollectionKeys = new Set(data.allowedCollectionKeys);
		const missingScopes = targetCollectionKeys
			.filter((collectionKey) => !allowedCollectionKeys.has(collectionKey))
			.map(getCollectionClientScope);

		if (missingScopes.length > 0) {
			return {
				error: {
					type: "authorisation",
					name: copy("server:core.client.integrations.scopes.error.name"),
					message: copy(
						"server:core.client.integrations.scopes.missing.message",
						{
							data: {
								requiredScopes: missingScopes.join(", "),
								missingScopes: missingScopes.join(", "),
							},
						},
					),
					status: 403,
				},
				data: undefined,
			};
		}
	}

	if (targetCollectionKeys.length === 0) {
		return {
			error: undefined,
			data: {
				filters: [],
				filterOr: filterOr.map(() => []),
				relationCollectionDefaults,
			},
		};
	}

	const primeSchemasRes = await primeRuntimeSchemas(context, {
		collectionKeys: targetCollectionKeys,
	});
	if (primeSchemasRes.error) return primeSchemasRes;

	const targetResults = await Promise.all(
		targetCollectionKeys.map(async (collectionKey) => {
			const [bricksTableSchemaRes, tableNamesRes] = await Promise.all([
				getBricksTableSchema(context, collectionKey),
				getTableNames(context, collectionKey),
			]);
			if (bricksTableSchemaRes.error) return bricksTableSchemaRes;
			if (tableNamesRes.error) return tableNamesRes;
			const targetCollection = context.config.collections.find(
				(collection) => collection.key === collectionKey,
			);

			return {
				error: undefined,
				data: {
					collectionKey,
					bricksTableSchema: bricksTableSchemaRes.data,
					relationCollectionDefaults: targetCollection
						? collectionDefaultsFromDescriptors(
								relationFilterDescriptors(
									targetCollection,
									bricksTableSchemaRes.data,
								),
							)
						: new Map<string, string>(),
					tables: {
						document: tableNamesRes.data.document,
						versions: tableNamesRes.data.version,
					},
					versionType:
						data.resolveVersionType?.({
							fieldType: "relation",
							table: tableNamesRes.data.document,
							collectionKey,
						}) ?? data.relationVersionType,
				},
			};
		}),
	);

	const targets = new Map<string, ResolvedRelationFilterTarget>();
	for (const targetResult of targetResults) {
		if (targetResult.error) return targetResult;
		targets.set(targetResult.data.collectionKey, targetResult.data);
	}

	return {
		error: undefined,
		data: {
			filters: buildResolvedFilters({ pending: filters, targets }),
			filterOr: filterOr.map((group) =>
				buildResolvedFilters({ pending: group, targets }),
			),
			relationCollectionDefaults,
		},
	};
};

export default resolveRelationDocumentFilters;

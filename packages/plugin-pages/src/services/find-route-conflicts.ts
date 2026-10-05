import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../constants.js";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteScope,
	RouteUniquenessItem,
} from "../types/types.js";
import getCollectionDefaultLocale from "../utils/get-collection-default-locale.js";
import normalizePathValue from "../utils/normalize-path-value.js";
import { scopeVersionFilter } from "../utils/route-scope.js";
import {
	buildRouteUniquenessItems,
	findExistingRouteCollisions,
	findProjectedRouteDuplicates,
} from "../utils/route-uniqueness.js";

/** Reads the stored routes in the scope that share a path and locale with a projected route. */
const getExistingRouteItems: ServiceFn<
	[
		{
			projectedItems: RouteUniquenessItem[];
			scope: RouteScope;
			collectionKey: string;
			tables: CollectionTableNames;
			excludeDocumentIds: number[];
		},
	],
	RouteUniquenessItem[]
> = async (context, data) => {
	if (data.projectedItems.length === 0) {
		return { error: undefined, data: [] };
	}

	const fullSlugValues = [
		...new Set(data.projectedItems.map((item) => item.fullSlug)),
	];
	const localeValues = [
		...new Set(data.projectedItems.map((item) => item.locale)),
	];
	const {
		document: documentTable,
		version: versionTable,
		documentFields: fieldsTable,
	} = data.tables;
	const fullSlugColumn = prefixGeneratedColName(constants.fields.fullSlug.key);
	const defaultLocale = getCollectionDefaultLocale(
		context.config,
		data.collectionKey,
	);
	const assignedLocales = localeValues.filter((locale) => locale !== null);
	const includesUnassigned = localeValues.includes(null);

	const versions = sql<
		LucidDB[CollectionTableNames["version"]]
	>`${sql.table(versionTable)}`;
	const fields = sql<
		LucidDB[CollectionTableNames["documentFields"]]
	>`${sql.table(fieldsTable)}`;

	let query = context.db.kysely
		.selectFrom(context.db.kysely.dynamic.table(documentTable).as("d"))
		.innerJoin(versions.as("v"), "v.document_id", "d.id")
		.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
		.select([
			"d.id as document_id",
			"v.id as document_version_id",
			"f.locale",
			sql<string | null>`${sql.ref(`f.${fullSlugColumn}`)}`.as("_fullSlug"),
		])
		.where(
			sql<string>`lower(${sql.ref(`f.${fullSlugColumn}`)})`,
			"in",
			fullSlugValues,
		)
		.where((eb) =>
			assignedLocales.length > 0
				? eb.or([
						eb("f.locale", "is", null),
						eb("f.locale", "in", assignedLocales),
					])
				: eb("f.locale", "is", null),
		)
		.where(scopeVersionFilter("v", data.scope))
		.where("d.collection_key", "=", data.collectionKey)
		.where(
			"d.is_deleted",
			"=",
			context.config.db.getDefault("boolean", "false"),
		);

	// An explicit row, including a cleared value, supersedes the inherited row.
	if (!includesUnassigned) {
		query = query.where((eb) => {
			const assignedRow = eb
				.selectFrom(fields.as("assigned_fields"))
				.select("assigned_fields.id")
				.whereRef("assigned_fields.document_version_id", "=", "v.id")
				.where("assigned_fields.locale", "=", eb.val(defaultLocale));

			return eb.or([
				eb("f.locale", "is not", null),
				eb.not(eb.exists(assignedRow)),
			]);
		});
	}
	if (data.excludeDocumentIds.length > 0) {
		query = query.where("d.id", "not in", data.excludeDocumentIds);
	}

	const rowsRes = await context.db
		.query<{
			document_id: number;
			document_version_id: number;
			locale: string | null;
			_fullSlug: string | null;
		}>("pages.unique.existing-routes.find", () => query)
		.many();
	if (rowsRes.error) return rowsRes;

	const items: RouteUniquenessItem[] = [];
	for (const row of rowsRes.data) {
		const fullSlug = normalizePathValue(row._fullSlug);
		if (!fullSlug) continue;

		items.push({
			documentId: row.document_id,
			versionId: row.document_version_id,
			locale: row.locale ?? (includesUnassigned ? null : defaultLocale),
			fullSlug,
		});
	}

	return {
		error: undefined,
		data: items,
	};
};

/**
 * Finds projected routes that collide with each other or with routes stored in
 * the scope, ignoring the excluded documents. Returns nothing when the
 * collection does not enforce unique routes.
 */
const findRouteConflicts: ServiceFn<
	[
		{
			collection: CollectionConfig;
			projectedFullSlugs: ProjectedFullSlug[];
			scope: RouteScope;
			tables: CollectionTableNames;
			excludeDocumentIds?: number[];
		},
	],
	RouteUniquenessItem[]
> = async (context, data) => {
	if (!data.collection.unique) return { error: undefined, data: [] };

	const projectedItems = buildRouteUniquenessItems({
		projectedFullSlugs: data.projectedFullSlugs,
	});
	const projectedDuplicates = findProjectedRouteDuplicates(projectedItems);
	if (projectedDuplicates.length > 0) {
		return { error: undefined, data: projectedDuplicates };
	}

	const existingItemsRes = await getExistingRouteItems(context, {
		projectedItems,
		scope: data.scope,
		collectionKey: data.collection.key,
		tables: data.tables,
		excludeDocumentIds: data.excludeDocumentIds ?? [],
	});
	if (existingItemsRes.error) return existingItemsRes;

	return {
		error: undefined,
		data: findExistingRouteCollisions({
			projectedItems,
			existingItems: existingItemsRes.data,
		}),
	};
};

export default findRouteConflicts;

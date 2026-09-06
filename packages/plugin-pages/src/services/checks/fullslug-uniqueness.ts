import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	DocumentVersionType,
	ErrorCopy,
	FieldError,
	LucidDB,
	ServiceFn,
	ServiceResponse,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../../constants.js";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteUniquenessItem,
} from "../../types/types.js";
import getCollectionDefaultLocale from "../../utils/get-collection-default-locale.js";
import normalizePathValue from "../../utils/normalize-path-value.js";
import {
	buildRouteUniquenessItems,
	findExistingRouteCollisions,
	findProjectedRouteDuplicates,
} from "../../utils/route-uniqueness.js";

type ServiceContext = Parameters<ServiceFn<[], undefined>>[0];

const getExistingRouteItems = async (
	context: ServiceContext,
	data: {
		projectedItems: RouteUniquenessItem[];
		versionType: Exclude<DocumentVersionType, "revision">;
		collectionKey: string;
		tables: CollectionTableNames;
		excludeDocumentIds: number[];
	},
): ServiceResponse<RouteUniquenessItem[]> => {
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

	const assignedLocales = localeValues.filter((locale) => locale !== null);
	const includesUnassigned = localeValues.includes(null);

	const rowsResult = await context.db
		.query<{
			document_id: number;
			document_version_id: number;
			locale: string | null;
			_fullSlug: string | null;
		}>("pages.unique.existing-routes.find", (db) => {
			const versions = sql<
				LucidDB[CollectionTableNames["version"]]
			>`${sql.table(versionTable)}`;

			const fields = sql<
				LucidDB[CollectionTableNames["documentFields"]]
			>`${sql.table(fieldsTable)}`;

			let query = db
				.selectFrom(db.dynamic.table(documentTable).as("d"))
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
				.where("v.type", "=", data.versionType)
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
						.where(
							"assigned_fields.locale",
							"=",
							eb.val(
								getCollectionDefaultLocale(context.config, data.collectionKey),
							),
						);

					return eb.or([
						eb("f.locale", "is not", null),
						eb.not(eb.exists(assignedRow)),
					]);
				});
			}

			return data.excludeDocumentIds.length > 0
				? query.where("d.id", "not in", data.excludeDocumentIds)
				: query;
		})
		.many();
	if (rowsResult.error) return rowsResult;

	const rows = rowsResult.data;
	const items: RouteUniquenessItem[] = [];

	for (const row of rows) {
		const fullSlug = normalizePathValue(row._fullSlug);
		if (!fullSlug) continue;

		items.push({
			documentId: row.document_id,
			versionId: row.document_version_id,
			locale:
				row.locale ??
				(localeValues.includes(null)
					? null
					: getCollectionDefaultLocale(context.config, data.collectionKey)),
			fullSlug,
		});
	}

	return {
		error: undefined,
		data: items,
	};
};

/** Checks complete projected routes against this collection's stored routes. */
const checkFullSlugUniqueness: ServiceFn<
	[
		{
			collection: CollectionConfig;
			projectedFullSlugs: ProjectedFullSlug[];
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tables: CollectionTableNames;
			excludeDocumentIds?: number[];
			duplicateMessage?: ErrorCopy;
		},
	],
	undefined
> = async (context, data) => {
	try {
		if (!data.collection.unique) {
			return { error: undefined, data: undefined };
		}

		const projectedItems = buildRouteUniquenessItems({
			projectedFullSlugs: data.projectedFullSlugs,
		});
		const projectedDuplicates = findProjectedRouteDuplicates(projectedItems);

		if (projectedDuplicates.length > 0) {
			const fieldErrors: FieldError[] = projectedDuplicates.map((conflict) => ({
				key: constants.fields.slug.key,
				localeCode: conflict.locale,
				message:
					data.duplicateMessage ??
					copy("server:plugin.pages.full.slug.duplicate"),
			}));

			return {
				error: {
					type: "basic",
					status: 400,
					message:
						data.duplicateMessage ??
						copy("server:plugin.pages.full.slug.duplicate"),
					errors: { fields: fieldErrors },
				},
				data: undefined,
			};
		}

		const existingItemsRes = await getExistingRouteItems(context, {
			projectedItems,
			versionType: data.versionType,
			collectionKey: data.collectionKey,
			tables: data.tables,
			excludeDocumentIds: data.excludeDocumentIds ?? [],
		});
		if (existingItemsRes.error) return existingItemsRes;

		const existingCollisions = findExistingRouteCollisions({
			projectedItems,
			existingItems: existingItemsRes.data,
		});
		if (existingCollisions.length > 0) {
			const fieldErrors: FieldError[] = existingCollisions.map((conflict) => ({
				key: constants.fields.slug.key,
				localeCode: conflict.locale,
				message:
					data.duplicateMessage ??
					copy("server:plugin.pages.full.slug.duplicate"),
			}));

			return {
				error: {
					type: "basic",
					status: 400,
					message:
						data.duplicateMessage ??
						copy("server:plugin.pages.full.slug.duplicate"),
					errors: { fields: fieldErrors },
				},
				data: undefined,
			};
		}

		return { error: undefined, data: undefined };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.full.slug.duplicate.check.failed"),
			},
			data: undefined,
		};
	}
};

export default checkFullSlugUniqueness;

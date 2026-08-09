import { copy, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	ErrorCopy,
	FieldError,
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

	const rowsResult = await context.db
		.query("pages.unique.existing-routes.find", (db) => {
			const query = db
				.selectFrom(documentTable)
				.innerJoin(
					versionTable,
					// @ts-expect-error Dynamic generated table names are resolved at runtime.
					`${versionTable}.document_id`,
					`${documentTable}.id`,
				)
				.innerJoin(
					fieldsTable,
					// @ts-expect-error Dynamic generated table names are resolved at runtime.
					`${fieldsTable}.document_version_id`,
					`${versionTable}.id`,
				)
				// @ts-expect-error Dynamic generated table names are resolved at runtime.
				.select([
					`${documentTable}.id as document_id`,
					`${versionTable}.id as document_version_id`,
					`${fieldsTable}.locale`,
					`${fieldsTable}.${fullSlugColumn} as _fullSlug`,
				])
				// @ts-expect-error Dynamic generated table names are resolved at runtime.
				.where(({ eb, and }) =>
					and([
						eb(
							sql<string>`lower(${sql.ref(`${fieldsTable}.${fullSlugColumn}`)})`,
							"in",
							fullSlugValues,
						),
						eb(`${fieldsTable}.locale`, "in", localeValues),
						eb(`${versionTable}.type`, "=", data.versionType),
					]),
				)
				.where(`${documentTable}.collection_key`, "=", data.collectionKey)
				.where(
					`${documentTable}.is_deleted`,
					"=",
					context.config.db.getDefault("boolean", "false"),
				);

			return data.excludeDocumentIds.length > 0
				? query.where(`${documentTable}.id`, "not in", data.excludeDocumentIds)
				: query;
		})
		.many();
	if (rowsResult.error) return rowsResult;
	const rows = rowsResult.data as Array<{
		document_id: number;
		document_version_id: number;
		locale: string;
		_fullSlug: string | null;
	}>;
	const items: RouteUniquenessItem[] = [];

	for (const row of rows) {
		const fullSlug = normalizePathValue(row._fullSlug);
		if (!fullSlug) continue;

		items.push({
			documentId: row.document_id,
			versionId: row.document_version_id,
			locale: row.locale,
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

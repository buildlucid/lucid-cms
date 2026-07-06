import type { CollectionBuilder } from "@lucidcms/core";
import { copy, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	ErrorCopy,
	FieldError,
	FieldInputSchema,
	ServiceFn,
	ServiceResponse,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../../constants.js";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteUniquenessItem,
	RouteUniqueValues,
} from "../../types/types.js";
import applyTenantScope from "../../utils/apply-tenant-scope.js";
import normalizePathValue from "../../utils/normalize-path-value.js";
import {
	buildRouteUniquenessItems,
	findExistingRouteCollisions,
	findProjectedRouteDuplicates,
} from "../../utils/route-uniqueness.js";
import {
	getUniqueFields,
	getUniqueValuesFromFields,
	isColumnUniqueField,
	isRelationUniqueField,
	mergeRelationUniqueValueMaps,
	type RelationUniqueFieldQueryRow,
	type RelationUniqueValueMap,
	relationRowsToUniqueValueMap,
	rowToUniqueValues,
	type UniqueField,
	type UniqueFieldQueryRow,
	uniqueFieldAlias,
} from "./fullslug-unique-fields.js";

type ServiceContext = Parameters<ServiceFn<[], undefined>>[0];

/** Reads generated relation-table rows for relation-backed unique fields. */
const getStoredRelationUniqueValues = async (
	context: ServiceContext,
	data: {
		uniqueFields: UniqueField[];
		versionIds: number[];
		localeValues: string[];
		defaultLocale: string;
	},
): Promise<RelationUniqueValueMap> => {
	const relationFields = data.uniqueFields.filter(isRelationUniqueField);
	if (relationFields.length === 0 || data.versionIds.length === 0) {
		return new Map();
	}

	const relationValueMaps = await Promise.all(
		relationFields.map(async (field) => {
			const locales = field.localized
				? data.localeValues
				: [data.defaultLocale];

			const rows = (await context.db.client
				.selectFrom(field.table)
				.select([
					`${field.table}.document_version_id`,
					`${field.table}.locale`,
					`${field.table}.position`,
					...field.valueColumns.map((column) => `${field.table}.${column}`),
				])
				.where(`${field.table}.document_version_id`, "in", data.versionIds)
				.where(`${field.table}.locale`, "in", locales)
				.orderBy(`${field.table}.position`)
				.execute()) as RelationUniqueFieldQueryRow[];

			return relationRowsToUniqueValueMap({
				field,
				rows,
			});
		}),
	);

	return mergeRelationUniqueValueMaps(relationValueMaps);
};

/** Adds stored unique field values to projected routes before comparison. */
const ensureProjectedUniqueValues = async (
	context: ServiceContext,
	data: {
		projectedFullSlugs: ProjectedFullSlug[];
		uniqueFields: UniqueField[];
		defaultLocale: string;
		tables: CollectionTableNames;
	},
): ServiceResponse<ProjectedFullSlug[]> => {
	if (data.uniqueFields.length === 0) {
		return {
			error: undefined,
			data: data.projectedFullSlugs.map((projected) => ({
				...projected,
				uniqueValues:
					projected.uniqueValues ??
					Object.fromEntries(
						Object.keys(projected.fullSlugs).map((locale) => [locale, {}]),
					),
			})),
		};
	}

	const versionIds = [
		...new Set(
			data.projectedFullSlugs
				.filter((projected) => !projected.uniqueValues)
				.map((projected) => projected.versionId),
		),
	];

	const rowsByVersionLocale = new Map<string, UniqueFieldQueryRow>();
	const localeValues = [
		...new Set(
			data.projectedFullSlugs.flatMap((projected) => [
				...Object.keys(projected.fullSlugs),
				data.defaultLocale,
			]),
		),
	];
	let relationValues: RelationUniqueValueMap = new Map();

	if (versionIds.length > 0) {
		const { documentFields: fieldsTable, version: versionTable } = data.tables;
		const defaultFieldsAlias = "default_fields";
		const hasDefaultLocalePartition = data.uniqueFields.some(
			(field) => isColumnUniqueField(field) && !field.localized,
		);
		relationValues = await getStoredRelationUniqueValues(context, {
			uniqueFields: data.uniqueFields,
			versionIds,
			localeValues,
			defaultLocale: data.defaultLocale,
		});

		const query = context.db.client
			.selectFrom(fieldsTable)
			.innerJoin(
				versionTable,
				`${versionTable}.id`,
				`${fieldsTable}.document_version_id`,
			)
			.$if(hasDefaultLocalePartition, (qb) =>
				qb.leftJoin(`${fieldsTable} as ${defaultFieldsAlias}`, (join) =>
					join
						.onRef(
							`${defaultFieldsAlias}.document_version_id`,
							"=",
							`${fieldsTable}.document_version_id`,
						)
						.on(`${defaultFieldsAlias}.locale`, "=", data.defaultLocale),
				),
			)
			.select([
				`${versionTable}.document_id`,
				`${fieldsTable}.document_version_id`,
				`${fieldsTable}.locale`,
			])
			.select(
				data.uniqueFields.flatMap((field, index) => {
					if (!isColumnUniqueField(field)) return [];

					return [
						sql<unknown>`${sql.ref(
							`${field.localized ? fieldsTable : defaultFieldsAlias}.${
								field.column
							}`,
						)}`.as(uniqueFieldAlias(index)),
					];
				}),
			)
			.where(`${fieldsTable}.document_version_id`, "in", versionIds);

		const rows = (await query.execute()) as UniqueFieldQueryRow[];
		for (const row of rows) {
			rowsByVersionLocale.set(`${row.document_version_id}:${row.locale}`, row);
		}
	}

	return {
		error: undefined,
		data: data.projectedFullSlugs.map((projected) => {
			if (projected.uniqueValues) return projected;

			const uniqueValues: RouteUniqueValues = {};
			for (const locale of Object.keys(projected.fullSlugs)) {
				const row = rowsByVersionLocale.get(`${projected.versionId}:${locale}`);
				uniqueValues[locale] = rowToUniqueValues({
					row,
					uniqueFields: data.uniqueFields,
					relationValues,
					versionId: projected.versionId,
					localeCode: locale,
					defaultLocale: data.defaultLocale,
				});
			}

			return {
				...projected,
				uniqueValues,
			};
		}),
	};
};

/** Fetches existing routes that could collide with the projected fullSlugs. */
const getExistingRouteItems = async (
	context: ServiceContext,
	data: {
		projectedItems: RouteUniquenessItem[];
		uniqueFields: UniqueField[];
		versionType: Exclude<DocumentVersionType, "revision">;
		collectionKey: string;
		tenantKey: string | null;
		tables: CollectionTableNames;
		excludeDocumentIds: number[];
		defaultLocale: string;
	},
): ServiceResponse<RouteUniquenessItem[]> => {
	if (data.projectedItems.length === 0) {
		return {
			error: undefined,
			data: [],
		};
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
	const defaultFieldsAlias = "default_fields";
	const hasDefaultLocalePartition = data.uniqueFields.some(
		(field) => isColumnUniqueField(field) && !field.localized,
	);

	const query = context.db.client
		.selectFrom(documentTable)
		.innerJoin(
			versionTable,
			// @ts-expect-error
			`${versionTable}.document_id`,
			`${documentTable}.id`,
		)
		.innerJoin(
			fieldsTable,
			// @ts-expect-error
			`${fieldsTable}.document_version_id`,
			`${versionTable}.id`,
		)
		.$if(hasDefaultLocalePartition, (qb) =>
			// @ts-expect-error
			qb.leftJoin(`${fieldsTable} as ${defaultFieldsAlias}`, (join) =>
				join
					.onRef(
						`${defaultFieldsAlias}.document_version_id`,
						"=",
						`${fieldsTable}.document_version_id`,
					)
					.on(`${defaultFieldsAlias}.locale`, "=", data.defaultLocale),
			),
		)
		// @ts-expect-error
		.select([
			`${documentTable}.id as document_id`,
			`${versionTable}.id as document_version_id`,
			`${fieldsTable}.locale`,
			`${fieldsTable}.${fullSlugColumn} as _fullSlug`,
		])
		.select(
			data.uniqueFields.flatMap((field, index) => {
				if (!isColumnUniqueField(field)) return [];

				return [
					sql<unknown>`${sql.ref(
						`${field.localized ? fieldsTable : defaultFieldsAlias}.${
							field.column
						}`,
					)}`.as(uniqueFieldAlias(index)),
				];
			}),
		)
		// @ts-expect-error
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

	const filteredQuery =
		data.excludeDocumentIds.length > 0
			? query.where(`${documentTable}.id`, "not in", data.excludeDocumentIds)
			: query;

	const rows = (await applyTenantScope(filteredQuery, {
		tenantKey: data.tenantKey,
		column: `${documentTable}.tenant_key`,
	}).execute()) as Array<
		UniqueFieldQueryRow & {
			_fullSlug: string | null;
		}
	>;
	const existingVersionIds = [
		...new Set(rows.map((row) => row.document_version_id)),
	];
	const relationValues = await getStoredRelationUniqueValues(context, {
		uniqueFields: data.uniqueFields,
		versionIds: existingVersionIds,
		localeValues: [...new Set([...localeValues, data.defaultLocale])],
		defaultLocale: data.defaultLocale,
	});

	return {
		error: undefined,
		data: rows.map((row) => ({
			documentId: row.document_id,
			versionId: row.document_version_id,
			locale: row.locale,
			fullSlug: normalizePathValue(row._fullSlug) ?? "",
			uniqueValues: rowToUniqueValues({
				row,
				uniqueFields: data.uniqueFields,
				relationValues,
				versionId: row.document_version_id,
				localeCode: row.locale,
				defaultLocale: data.defaultLocale,
			}),
		})),
	};
};

/** Checks projected fullSlug routes against themselves and existing routes. */
const checkFullSlugUniqueness: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			projectedFullSlugs: ProjectedFullSlug[];
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tenantKey: string | null;
			tables: CollectionTableNames;
			excludeDocumentIds?: number[];
			inputFields?: {
				documentId: number;
				versionId: number;
				fields: FieldInputSchema[];
			};
			duplicateMessage?: ErrorCopy;
		},
	],
	undefined
> = async (context, data) => {
	try {
		if (data.collection.unique === false) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const uniqueFieldsRes = getUniqueFields(
			data.collectionInstance,
			data.collection,
			context.config.db.config.tableNameByteLimit,
		);
		if (uniqueFieldsRes.error) return uniqueFieldsRes;

		const projectedFullSlugs = data.projectedFullSlugs.map((projected) => {
			if (
				!data.inputFields ||
				projected.documentId !== data.inputFields.documentId ||
				projected.versionId !== data.inputFields.versionId
			) {
				return projected;
			}

			return {
				...projected,
				uniqueValues: getUniqueValuesFromFields({
					fields: data.inputFields.fields,
					localization: context.config.localization,
					uniqueFields: uniqueFieldsRes.data,
				}),
			};
		});

		const projectedWithUniqueValuesRes = await ensureProjectedUniqueValues(
			context,
			{
				projectedFullSlugs,
				uniqueFields: uniqueFieldsRes.data,
				defaultLocale: context.config.localization.defaultLocale,
				tables: data.tables,
			},
		);
		if (projectedWithUniqueValuesRes.error) return projectedWithUniqueValuesRes;

		const projectedItems = buildRouteUniquenessItems({
			projectedFullSlugs: projectedWithUniqueValuesRes.data,
			defaultLocale: context.config.localization.defaultLocale,
		});
		const projectedDuplicates = findProjectedRouteDuplicates(projectedItems);

		if (projectedDuplicates.length > 0) {
			const message =
				data.duplicateMessage ??
				copy("server:plugin.pages.full.slug.duplicate");
			const fieldErrors: FieldError[] = projectedDuplicates.map((conflict) => ({
				key: constants.fields.slug.key,
				localeCode: conflict.locale,
				message,
			}));

			return {
				error: {
					type: "basic",
					status: 400,
					message,
					errors: {
						fields: fieldErrors,
					},
				},
				data: undefined,
			};
		}

		const existingItemsRes = await getExistingRouteItems(context, {
			projectedItems,
			uniqueFields: uniqueFieldsRes.data,
			versionType: data.versionType,
			collectionKey: data.collectionKey,
			tenantKey: data.tenantKey,
			tables: data.tables,
			excludeDocumentIds: data.excludeDocumentIds ?? [],
			defaultLocale: context.config.localization.defaultLocale,
		});
		if (existingItemsRes.error) return existingItemsRes;

		const existingCollisions = findExistingRouteCollisions({
			projectedItems,
			existingItems: existingItemsRes.data,
		});

		if (existingCollisions.length > 0) {
			const message =
				data.duplicateMessage ??
				copy("server:plugin.pages.full.slug.duplicate");
			const fieldErrors: FieldError[] = existingCollisions.map((conflict) => ({
				key: constants.fields.slug.key,
				localeCode: conflict.locale,
				message,
			}));

			return {
				error: {
					type: "basic",
					status: 400,
					message,
					errors: {
						fields: fieldErrors,
					},
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: undefined,
		};
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

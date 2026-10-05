import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import type { RouteScope } from "../types/types.js";
import getCollectionDefaultLocale from "../utils/get-collection-default-locale.js";
import getParentPageRelationTable from "../utils/get-parent-page-relation-table.js";
import resolveInheritedLocaleRows from "../utils/resolve-inherited-locale-rows.js";
import {
	scopeParameterCount,
	scopeVersionFilter,
} from "../utils/route-scope.js";

export type PageFieldsRow = {
	locale: string | null;
	_slug: string | null;
	_fullSlug: string | null;
	_parentPage: number | null;
};

export type PageVersionFields = {
	document_id: number;
	document_version_id: number;
	rows: PageFieldsRow[];
};

/**
 * Reads the slug, fullSlug and parent page of page versions, by document in the
 * scope's version or by explicit version ID. Rows are grouped per version with
 * unassigned values exposed under the default locale.
 */
const getPagesFields: ServiceFn<
	[
		{
			collectionKey: string;
			scope: RouteScope;
			tables: {
				version: LucidVersionTableName;
				documentFields: LucidBrickTableName;
			};
		} & ({ documentIds: number[] } | { versionIds: number[] }),
	],
	PageVersionFields[]
> = async (context, data) => {
	const ids = [
		...new Set("documentIds" in data ? data.documentIds : data.versionIds),
	];
	if (ids.length === 0) return { error: undefined, data: [] };

	try {
		const { version: versionTable, documentFields: fieldsTable } = data.tables;
		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const fullSlugColumn = prefixGeneratedColName(
			constants.fields.fullSlug.key,
		);
		const parentPageColumn = prefixGeneratedColName("document_id");
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;
		const defaultFieldsAlias = "default_fields";
		const idColumn =
			"documentIds" in data
				? `${versionTable}.document_id`
				: `${versionTable}.id`;

		const batchSize = context.config.db.getQueryBatchSize({
			parametersPerItem: 1,
			reservedParameters: scopeParameterCount(data.scope),
		});
		const rows: Array<
			PageFieldsRow & { document_id: number; document_version_id: number }
		> = [];
		for (let offset = 0; offset < ids.length; offset += batchSize) {
			const query = context.db.kysely
				.selectFrom(fieldsTable)
				.innerJoin(
					versionTable,
					`${versionTable}.id`,
					`${fieldsTable}.document_version_id`,
				)
				.leftJoin(`${fieldsTable} as ${defaultFieldsAlias}`, (join) =>
					join
						.onRef(
							`${defaultFieldsAlias}.document_version_id`,
							"=",
							`${fieldsTable}.document_version_id`,
						)
						.on(`${defaultFieldsAlias}.locale`, "is", null),
				)
				.leftJoin(parentPageTable, (join) =>
					join
						.onRef(
							`${parentPageTable}.parent_id`,
							"=",
							`${defaultFieldsAlias}.id`,
						)
						.on(`${parentPageTable}.locale`, "is", null),
				)
				// @ts-expect-error
				.select([
					`${versionTable}.document_id`,
					`${fieldsTable}.document_version_id`,
					`${fieldsTable}.locale`,
					`${fieldsTable}.${slugColumn} as _slug`,
					`${fieldsTable}.${fullSlugColumn} as _fullSlug`,
					`${parentPageTable}.${parentPageColumn} as _parentPage`,
				])
				.where(idColumn, "in", ids.slice(offset, offset + batchSize))
				.where(scopeVersionFilter(versionTable, data.scope));

			const result = await context.db
				.query("pages.fields.find", () => query)
				.many();
			if (result.error) return result;
			rows.push(...(result.data as typeof rows));
		}

		const versions = new Map<number, PageVersionFields>();
		for (const row of rows) {
			const version = versions.get(row.document_version_id) ?? {
				document_id: row.document_id,
				document_version_id: row.document_version_id,
				rows: [],
			};
			version.rows.push({
				locale: row.locale,
				_slug: row._slug,
				_fullSlug: row._fullSlug,
				_parentPage: row._parentPage,
			});
			versions.set(row.document_version_id, version);
		}

		const defaultLocale = getCollectionDefaultLocale(
			context.config,
			data.collectionKey,
		);
		return {
			error: undefined,
			data: [...versions.values()].map((version) => ({
				...version,
				rows: resolveInheritedLocaleRows(version.rows, defaultLocale),
			})),
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy(
					"server:plugin.pages.documents.version.fields.fetch.failed",
				),
			},
			data: undefined,
		};
	}
};

export default getPagesFields;

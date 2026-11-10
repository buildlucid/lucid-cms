import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
	Toolkit,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../constants.js";
import type {
	CollectionConfig,
	ProjectedPath,
	RouteScope,
} from "../types/types.js";
import getCollectionDefaultLocale from "../utils/get-collection-default-locale.js";
import normalizePathValue from "../utils/normalize-path-value.js";
import {
	scopeMemberFilter,
	scopeParameterCount,
} from "../utils/route-scope.js";
import recordPaths from "./record-paths.js";

/**
 * Writes scoped route values in batches per locale, inheriting unassigned values from the default
 * locale. Published paths are recorded so they redirect once they change. Reports document updates
 * except where the caller already does.
 */
const updateRouteFields: ServiceFn<
	[
		{
			collection: CollectionConfig;
			field: "slug" | "path";
			scope: RouteScope;
			toolkit: Toolkit;
			excludeDocumentIds?: number[];
			values: ProjectedPath[];
			tables: {
				documentFields: LucidBrickTableName;
				version: LucidVersionTableName;
			};
		},
	],
	undefined
> = async (context, data) => {
	try {
		const { documentFields: fieldsTable, version: versionTable } = data.tables;
		const column = prefixGeneratedColName(constants.fields[data.field].key);
		const defaultLocale = getCollectionDefaultLocale(
			context.config,
			data.collection.key,
		);

		const byLocale = new Map<
			string | null,
			Array<{ versionId: number; value: string | null }>
		>();
		for (const document of data.values) {
			for (const [locale, value] of document.values) {
				const entries = byLocale.get(locale) ?? [];
				entries.push({
					versionId: document.versionId,
					value: normalizePathValue(value) ?? null,
				});
				byLocale.set(locale, entries);
			}
		}

		const batchSize = context.config.db.getQueryBatchSize({
			parametersPerItem: 3,
			reservedParameters: scopeParameterCount(data.scope) + 3,
		});
		for (const [locale, entries] of byLocale) {
			for (let offset = 0; offset < entries.length; offset += batchSize) {
				const batch = entries.slice(offset, offset + batchSize);
				const versionIds = batch.map((entry) => entry.versionId);
				const query = context.db.kysely
					.updateTable(fieldsTable)
					.set({
						[column]: sql`case ${sql.ref("document_version_id")} ${sql.join(
							batch.map(
								(entry) => sql`when ${entry.versionId} then ${entry.value}`,
							),
							sql` `,
						)} end`,
					})
					.where(
						sql<boolean>`${sql.ref("document_version_id")} in (select ${sql.ref(`${versionTable}.id`)} from ${sql.table(versionTable)} where ${sql.ref(`${versionTable}.id`)} in (${sql.join(versionIds)}) and ${scopeMemberFilter(versionTable, data.scope)})`,
					)
					.where(
						locale === null
							? sql<boolean>`${sql.ref("locale")} is null`
							: locale !== defaultLocale
								? sql<boolean>`${sql.ref("locale")} = ${locale}`
								: sql<boolean>`(${sql.ref("locale")} = ${locale} or (${sql.ref("locale")} is null and not exists (select 1 from ${sql.table(fieldsTable)} as assigned_fields where assigned_fields.document_version_id = ${sql.ref(`${fieldsTable}.document_version_id`)} and assigned_fields.locale = ${locale})))`,
					);

				const result = await context.db
					.query("pages.route-field.update", () => query)
					.many();
				if (result.error) return result;
			}
		}

		if (data.field !== "path") return { error: undefined, data: undefined };

		const recordRes = await recordPaths(context, {
			collection: data.collection,
			scope: data.scope,
			values: data.values,
		});
		if (recordRes.error) return recordRes;

		return data.toolkit.documents.notifyChange({
			change: {
				type: "updated",
				version:
					data.scope.type === "version" ? data.scope.versionType : undefined,
			},
			collectionKey: data.collection.key,
			ids: [
				...new Set(
					data.values
						.map((document) => document.documentId)
						.filter((id) => !data.excludeDocumentIds?.includes(id)),
				),
			],
		});
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.path.children.update.failed"),
			},
			data: undefined,
		};
	}
};

export default updateRouteFields;

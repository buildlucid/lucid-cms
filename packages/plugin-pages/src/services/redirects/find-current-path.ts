import { copy, z } from "@lucidcms/core";
import {
	getCollectionTableNames,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../../constants.js";
import getCollectionDefaultLocale from "../../utils/get-collection-default-locale.js";
import getPublishedVersion from "../../utils/get-published-version.js";
import resolveInheritedLocaleRows from "../../utils/resolve-inherited-locale-rows.js";

/**
 * Finds the published path for the environment and locale, falling back to the default locale and
 * its unassigned row. Returns null for unavailable pages.
 */
const findCurrentPath: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			environment: string;
			locale: string | null | undefined;
			/** Whether the collection's paths differ per locale. */
			localized: boolean;
		},
	],
	string | null
> = async (context, data) => {
	const collection = context.config.collections.find(
		(item) => item.key === data.collectionKey,
	);
	if (!collection) return { error: undefined, data: null };
	const version = getPublishedVersion(collection, data.environment);
	if (version === null) return { error: undefined, data: null };

	try {
		const tablesRes = await getCollectionTableNames(
			context,
			data.collectionKey,
		);
		if (tablesRes.error) return tablesRes;
		const tables = tablesRes.data;
		const pathColumn = prefixGeneratedColName(constants.fields.path.key);
		const versions = sql<
			LucidDB[CollectionTableNames["version"]]
		>`${sql.table(tables.version)}`;
		const fields = sql<
			LucidDB[CollectionTableNames["documentFields"]]
		>`${sql.table(tables.documentFields)}`;

		const query = context.db.kysely
			.selectFrom(context.db.kysely.dynamic.table(tables.document).as("d"))
			.innerJoin(versions.as("v"), "v.document_id", "d.id")
			.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
			.select([
				"f.locale",
				sql<string | null>`${sql.ref(`f.${pathColumn}`)}`.as("path"),
			])
			.where("d.id", "=", data.documentId)
			.where("d.collection_key", "=", data.collectionKey)
			.where(
				"d.is_deleted",
				"=",
				context.config.db.getDefault("boolean", "false"),
			)
			.where("v.type", "=", version);

		const rowsRes = await context.db
			.query("pages.redirects.current-path.find", () => query)
			.many({
				schema: z.object({
					locale: z.string().nullable(),
					path: z.string().nullable(),
				}),
			});
		if (rowsRes.error) return rowsRes;

		const defaultLocale = getCollectionDefaultLocale(
			context.config,
			data.collectionKey,
		);
		const rows = resolveInheritedLocaleRows(rowsRes.data, defaultLocale);
		//* paths recorded before localization was on have no locale, so they read the default's
		const locale = data.locale ?? defaultLocale;
		const row = data.localized
			? (rows.find((item) => item.locale === locale && item.path) ??
				rows.find((item) => item.locale === defaultLocale && item.path))
			: rows.find((item) => item.locale === null && item.path);

		return { error: undefined, data: row?.path ?? null };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.redirects.resolve.failed"),
			},
			data: undefined,
		};
	}
};

export default findCurrentPath;

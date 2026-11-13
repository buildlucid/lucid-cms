import { copy, z } from "@lucidcms/core";
import {
	buildTableName,
	getCollectionTableNames,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidBrickTableName,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import { fields } from "../../constants.js";
import type { SiteUrls } from "../resolve-site-urls.js";
import buildDocumentEntries, {
	type SitemapDocumentEntries,
} from "./build-document-entries.js";
import formatDate from "./format-date.js";
import type { SitemapTarget } from "./resolve-sitemap-targets.js";

const rowSchema = z.object({
	document_id: z.number(),
	locale: z.string().nullable(),
	//* routing fields may be numbers
	path: z.union([z.string(), z.number()]).nullable(),
	updated_at: z.union([z.string(), z.date()]).nullable(),
	indexing: z.string().nullable(),
	canonical_url: z.string().nullable(),
});

/**
 * Lists a collection's published pages with one query for their paths, version dates and the two
 * SEO fields that decide whether they are listed, rather than reading whole documents. Localized
 * values are read as core reads them: a locale's own row, or for the default locale the shared
 * row when it has none, and only in the locales the collection supports now.
 */
const getDocumentEntries: ServiceFn<
	[{ target: SitemapTarget; version: string; siteUrls: SiteUrls }],
	SitemapDocumentEntries
> = async (context, data) => {
	const { target } = data;
	const collectionKey = target.collection.key;

	try {
		const tablesRes = await getCollectionTableNames(context, collectionKey);
		if (tablesRes.error) return tablesRes;
		const brickTableRes = buildTableName<LucidBrickTableName>(
			"brick",
			{ collection: collectionKey, brick: target.brickKey },
			context.config.db.config.tableNameByteLimit,
		);
		if (brickTableRes.error) return brickTableRes;

		const tables = tablesRes.data;
		const versions = sql<
			LucidDB[CollectionTableNames["version"]]
		>`${sql.table(tables.version)}`;
		const documentFields = sql<
			LucidDB[CollectionTableNames["documentFields"]]
		>`${sql.table(tables.documentFields)}`;
		const seoBricks = sql<
			LucidDB[LucidBrickTableName]
		>`${sql.table(brickTableRes.data.name)}`;
		const path = sql.ref(`f.${prefixGeneratedColName(target.pathField)}`);
		const seoColumn = (key: string) =>
			sql<string | null>`${sql.ref(`s.${prefixGeneratedColName(key)}`)}`;
		const { localization } = target;
		const pathLocales = localization?.paths ? localization : null;
		//* an inherited default locale path is on the shared row, so its locale is filled in
		const locale = pathLocales
			? sql<
					string | null
				>`coalesce(${sql.ref("f.locale")}, ${pathLocales.defaultLocale})`
			: sql<string | null>`${sql.ref("f.locale")}`;

		const query = context.db.kysely
			.selectFrom(context.db.kysely.dynamic.table(tables.document).as("d"))
			.innerJoin(versions.as("v"), "v.document_id", "d.id")
			.innerJoin(documentFields.as("f"), "f.document_version_id", "v.id")
			//* documents saved before the SEO brick was added have no row, and use the field defaults
			.leftJoin(seoBricks.as("s"), (join) => {
				const brick = join
					.onRef("s.document_version_id", "=", "v.id")
					.on("s.brick_type", "=", "fixed");
				if (!localization?.seo) return brick.on("s.locale", "is", null);

				const { defaultLocale } = localization;
				//* read in the path's locale, or the default locale's when paths are shared
				const seoLocale = localization.paths ? locale : defaultLocale;
				return brick.on((eb) =>
					eb.or([
						eb("s.locale", "=", seoLocale),
						//* the default locale reads the shared row when it has no row of its own
						eb.and([
							eb("s.locale", "is", null),
							...(localization.paths ? [eb(locale, "=", defaultLocale)] : []),
							eb.not(
								eb.exists(
									eb
										.selectFrom(seoBricks.as("own"))
										.select("own.id")
										.whereRef("own.document_version_id", "=", "v.id")
										.where("own.brick_type", "=", "fixed")
										.where("own.locale", "=", defaultLocale),
								),
							),
						]),
					]),
				);
			})
			.select([
				"d.id as document_id",
				locale.as("locale"),
				sql<string | number | null>`${path}`.as("path"),
				"v.updated_at",
				seoColumn(fields.indexing).as("indexing"),
				seoColumn(fields.canonicalUrl).as("canonical_url"),
			])
			.where("d.collection_key", "=", collectionKey)
			.where(
				"d.is_deleted",
				"=",
				context.config.db.getDefault("boolean", "false"),
			)
			.where("v.type", "=", data.version)
			.where((eb) =>
				pathLocales
					? eb.or([
							eb("f.locale", "in", pathLocales.locales),
							eb.and([
								eb("f.locale", "is", null),
								eb.not(
									eb.exists(
										eb
											.selectFrom(documentFields.as("own"))
											.select("own.id")
											.whereRef("own.document_version_id", "=", "v.id")
											.where("own.locale", "=", pathLocales.defaultLocale),
									),
								),
							]),
						])
					: eb("f.locale", "is", null),
			)
			.where(path, "is not", null)
			.orderBy("d.id")
			.orderBy(locale);

		const rowsRes = await context.db
			.query("seo.sitemap.documents", () => query)
			.many({ schema: rowSchema });
		if (rowsRes.error) return rowsRes;

		return {
			error: undefined,
			data: buildDocumentEntries({
				rows: rowsRes.data.flatMap((row) => {
					const value = String(row.path ?? "").trim();
					if (!value) return [];
					return [
						{
							documentId: row.document_id,
							locale: row.locale,
							path: value,
							lastModified: formatDate(row.updated_at),
							indexing: row.indexing,
							canonicalUrl: row.canonical_url,
						},
					];
				}),
				file: collectionKey,
				siteUrls: data.siteUrls,
				defaultLocale: localization?.defaultLocale ?? null,
			}),
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.sitemap.documents.fetch.failed", {
					data: { collection: collectionKey },
				}),
			},
			data: undefined,
		};
	}
};

export default getDocumentEntries;

import { defineCollection, field } from "@lucidcms/core";
import {
	buildTableName,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import { createServiceContext } from "@lucidcms/core/runtime";
import { SQLiteAdapter } from "@lucidcms/sqlite";
import { sql } from "kysely";
import { afterAll, describe, expect, test, vi } from "vitest";
import { fields } from "../../constants.js";
import resolveSiteUrls, { type SiteUrls } from "../resolve-site-urls.js";
import getDocumentEntries from "./get-document-entries.js";
import type { SitemapTarget } from "./resolve-sitemap-targets.js";

const mocks = vi.hoisted(() => ({ getCollectionTableNames: vi.fn() }));

//* the tables below are made by hand, so there are no collection migrations for core to read names from
vi.mock("@lucidcms/core/extension", async (importOriginal) => ({
	...(await importOriginal<typeof import("@lucidcms/core/extension")>()),
	getCollectionTableNames: mocks.getCollectionTableNames,
}));

type Row = { locale: string | null };

/** A published document's rows: its path per locale and its SEO brick's rows. */
type DocumentRows = {
	paths: Array<Row & { path: string | null }>;
	seo?: Array<Row & { indexing?: string }>;
};

const adapter = new SQLiteAdapter({ database: ":memory:" });
const database = await adapter.connect();
const context = createServiceContext({
	config: { db: adapter, translations: { defaultLocale: "en" } } as never,
	database,
	translationStore: {} as never,
});
let nextId = 1;

/** Adds a row to a table made below, which Lucid's table types don't know. */
const insert = (table: string, row: Record<string, unknown>) =>
	sql`insert into ${sql.table(table)} (${sql.join(
		Object.keys(row).map((column) => sql.ref(column)),
	)}) values (${sql.join(Object.values(row))})`.execute(database.client);

const tableName = (
	type: "document" | "versions" | "document-fields" | "brick",
	collection: string,
) => {
	const name = buildTableName(
		type,
		{ collection, brick: "seo" },
		adapter.config.tableNameByteLimit,
	);
	if (name.error) throw new Error(name.error.message);
	return name.data.name;
};

/** Makes the columns of a collection's tables that the sitemap reads, with core's names, and fills them. */
const createCollection = async (key: string, documents: DocumentRows[]) => {
	const tables = {
		document: tableName("document", key),
		version: tableName("versions", key),
		documentFields: tableName("document-fields", key),
	};
	const brick = tableName("brick", key);
	const { schema } = database.client;

	await schema
		.createTable(tables.document)
		.addColumn("id", "integer", (column) => column.primaryKey())
		.addColumn("collection_key", "text")
		.addColumn("is_deleted", "boolean")
		.execute();
	await schema
		.createTable(tables.version)
		.addColumn("id", "integer", (column) => column.primaryKey())
		.addColumn("document_id", "integer")
		.addColumn("type", "text")
		.addColumn("updated_at", "text")
		.execute();
	await schema
		.createTable(tables.documentFields)
		.addColumn("id", "integer", (column) => column.primaryKey())
		.addColumn("document_version_id", "integer")
		.addColumn("locale", "text")
		.addColumn(prefixGeneratedColName("path"), "text")
		.execute();
	await schema
		.createTable(brick)
		.addColumn("id", "integer", (column) => column.primaryKey())
		.addColumn("document_version_id", "integer")
		.addColumn("brick_type", "text")
		.addColumn("locale", "text")
		.addColumn(prefixGeneratedColName(fields.indexing), "text")
		.addColumn(prefixGeneratedColName(fields.canonicalUrl), "text")
		.execute();

	for (const document of documents) {
		const documentId = nextId++;
		await insert(tables.document, {
			id: documentId,
			collection_key: key,
			is_deleted: adapter.getDefault("boolean", "false"),
		});
		await insert(tables.version, {
			id: documentId,
			document_id: documentId,
			type: "latest",
			updated_at: "2026-11-01T10:00:00.000Z",
		});
		for (const row of document.paths) {
			await insert(tables.documentFields, {
				id: nextId++,
				document_version_id: documentId,
				locale: row.locale,
				[prefixGeneratedColName("path")]: row.path,
			});
		}
		for (const row of document.seo ?? []) {
			await insert(brick, {
				id: nextId++,
				document_version_id: documentId,
				brick_type: "fixed",
				locale: row.locale,
				[prefixGeneratedColName(fields.indexing)]: row.indexing ?? null,
			});
		}
	}

	mocks.getCollectionTableNames.mockResolvedValueOnce({
		error: undefined,
		data: tables,
	});
};

/** Lists a collection localized in `en` and `fr`, as a project that once had `de` too. */
const list = (key: string, localized: { paths: boolean; seo: boolean }) => {
	const target: SitemapTarget = {
		collection: defineCollection({
			key,
			mode: "multiple",
			details: { labels: { singular: key, plural: key } },
			fields: [field.text("path")],
		}),
		brickKey: "seo",
		pathField: "path",
		localization: { locales: ["en", "fr"], defaultLocale: "en", ...localized },
	};
	return getDocumentEntries(context, {
		target,
		version: "latest",
		siteUrls: resolveSiteUrls({
			url: "https://cms.example.com",
			siteUrl: "https://example.com",
			localization: {
				locales: [
					{ label: "English", code: "en" },
					{ label: "French", code: "fr" },
				],
				defaultLocale: "en",
			},
		}) as SiteUrls,
	});
};

describe("sitemap document query", () => {
	afterAll(() => database.destroy());

	test("reads each locale's own path, the default locale's from the shared row, and only current locales", async () => {
		await createCollection("page", [
			{
				paths: [
					{ locale: null, path: null },
					{ locale: "en", path: "/en/about" },
					{ locale: "fr", path: "/fr/a-propos" },
					{ locale: "de", path: "/de/ueber" },
				],
			},
			//* saved before paths were localized, so the default locale's path is on the shared row
			{
				paths: [
					{ locale: null, path: "/en/legacy" },
					{ locale: "fr", path: "/fr/heritage" },
				],
			},
			//* a default locale row of its own wins over the shared row, even without a path
			{
				paths: [
					{ locale: null, path: "/stale" },
					{ locale: "en", path: null },
				],
			},
		]);

		const result = await list("page", { paths: true, seo: false });

		expect(
			result.data?.entries.map((entry) => [entry.path, entry.locale]),
		).toEqual([
			["/en/about", "en"],
			["/fr/a-propos", "fr"],
			["/en/legacy", "en"],
			["/fr/heritage", "fr"],
		]);
		expect(result.data?.entries[2]?.alternates).toEqual([
			{ hreflang: "en", url: "https://example.com/en/legacy" },
			{ hreflang: "fr", url: "https://example.com/fr/heritage" },
			{ hreflang: "x-default", url: "https://example.com/en/legacy" },
		]);
	});

	test("reads the default locale's SEO fields from the shared row when it has none of its own", async () => {
		await createCollection("post", [
			{
				paths: [
					{ locale: "en", path: "/en/hidden" },
					{ locale: "fr", path: "/fr/cache" },
				],
				seo: [{ locale: null, indexing: "noindex" }],
			},
			{
				paths: [{ locale: "en", path: "/en/shown" }],
				seo: [
					{ locale: null, indexing: "noindex" },
					{ locale: "en", indexing: "index" },
				],
			},
		]);
		await createCollection("guide", [
			{
				paths: [{ locale: null, path: "/hidden" }],
				seo: [{ locale: null, indexing: "noindex" }],
			},
			{
				paths: [{ locale: null, path: "/shown" }],
				seo: [
					{ locale: null, indexing: "noindex" },
					{ locale: "en", indexing: "index" },
				],
			},
		]);

		const localizedPaths = await list("post", { paths: true, seo: true });
		const sharedPaths = await list("guide", { paths: false, seo: true });

		//* other locales don't fall back to the shared row, as in core
		expect(localizedPaths.data?.entries.map((entry) => entry.path)).toEqual([
			"/fr/cache",
			"/en/shown",
		]);
		expect(localizedPaths.data?.excluded).toEqual([
			{ path: "/en/hidden", locale: "en" },
		]);
		expect(sharedPaths.data?.entries.map((entry) => entry.path)).toEqual([
			"/shown",
		]);
		expect(sharedPaths.data?.excluded).toEqual([
			{ path: "/hidden", locale: null },
		]);
	});
});

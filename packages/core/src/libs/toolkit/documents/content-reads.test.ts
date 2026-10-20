import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, describe, expect, test } from "vitest";
import getContentDocument from "../../../services/documents/content/get-single.js";
import publish from "../../../services/documents/publish.js";
import syncCollections from "../../../services/sync/sync-collections.js";
import syncLocales from "../../../services/sync/sync-locales.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import applyCollectionMigrations from "../../collection/apply-collection-migrations.js";
import BrickBuilder from "../../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import { getTableNames } from "../../collection/schema/runtime/runtime-schema-selectors.js";
import { createTranslationStore } from "../../i18n/index.js";
import createToolkit from "../create-toolkit.js";

const settings = new CollectionBuilder("settings", {
	mode: "multiple",
	localized: { locales: ["en"] },
	details: { labels: { singular: "Setting", plural: "Settings" } },
}).addText("label", { localized: true });
const guides = new CollectionBuilder("guides", {
	mode: "multiple",
	localized: { locales: ["en"] },
	routing: { field: "slug" },
	details: { labels: { singular: "Guide", plural: "Guides" } },
}).addText("slug", { localized: true });
const notes = new CollectionBuilder("notes", {
	mode: "multiple",
	details: { labels: { singular: "Note", plural: "Notes" } },
}).addRichText("body", { editor: { links: { internal: ["pages"] } } });
const articles = new CollectionBuilder("articles", {
	mode: "multiple",
	revisions: true,
	details: { labels: { singular: "Article", plural: "Articles" } },
}).addRelation("settings", { collection: "settings" });
const environments = [
	{ key: "staging", label: "Staging" },
	{ key: "production", label: "Production" },
];
const labels = new CollectionBuilder("labels", {
	mode: "multiple",
	details: { labels: { singular: "Label", plural: "Labels" } },
	publishing: { environments },
}).addText("name");
const cards = new CollectionBuilder("cards", {
	mode: "multiple",
	details: { labels: { singular: "Card", plural: "Cards" } },
	publishing: { environments },
}).addRelation("label", { collection: "labels" });
const boards = new CollectionBuilder("boards", {
	mode: "multiple",
	details: { labels: { singular: "Board", plural: "Boards" } },
	publishing: {
		environments: [
			{
				key: "production",
				label: "Production",
				collectionVersions: { labels: "staging" },
			},
		],
	},
})
	.addRelation("label", { collection: "labels" })
	.addRelation("card", { collection: "cards" });
const pages = new CollectionBuilder("pages", {
	mode: "multiple",
	localized: true,
	routing: { field: "slug" },
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: {
		builder: [new BrickBuilder("hero").addText("heading", { localized: true })],
		fixed: [new BrickBuilder("seo").addText("summary", { localized: false })],
	},
})
	.addText("slug", { localized: true })
	.addText("title", { localized: true })
	.addText("intro", { localized: true })
	.addJSON("data", { localized: false })
	.addRichText("body", {
		localized: false,
		editor: {
			variables: { document: ["pages"] },
			links: { internal: ["pages", "guides"] },
		},
	})
	.addRelation("settings", { collection: "settings", localized: false })
	.addRelation("related", { collection: "pages", localized: false })
	.addJSON("block", { localized: true })
	.addRichText("summary", {
		localized: true,
		editor: { links: { internal: ["guides"] } },
	});

describe("content document reads", () => {
	const fixture = getTestConfig();
	let toolkit: ReturnType<typeof createToolkit>;
	let context: ReturnType<typeof createServiceContext>;
	let pageId: number;

	beforeAll(async () => {
		const config = await fixture.getConfig();
		context = createServiceContext({
			config: {
				...config,
				collections: [
					settings,
					guides,
					notes,
					articles,
					labels,
					cards,
					boards,
					pages,
				],
				localization: {
					defaultLocale: "en",
					locales: [
						{ code: "en", label: "English" },
						{ code: "fr", label: "French" },
					],
				},
			},
			database: await fixture.getDatabase(),
			translationStore: createTranslationStore({
				defaultLocale: "en",
				bundles: { en: { admin: {}, server: {} } },
			}),
		});
		await fixture.migrate();
		expect((await syncLocales(context)).error).toBeUndefined();
		expect((await syncCollections(context)).error).toBeUndefined();
		const plan = await planCollectionMigrations(context);
		assert(plan.data, JSON.stringify(plan.error));
		expect(
			(await applyCollectionMigrations(context, plan.data)).error,
		).toBeUndefined();
		toolkit = createToolkit(context);

		const setting = await toolkit.documents.createSingle({
			collectionKey: "settings",
			actor: { type: "system" },
			data: { fields: { label: { en: "Footer" } } },
		});
		assert(setting.data, JSON.stringify(setting.error));
		const page = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: {
				fields: {
					slug: { en: "/about", fr: "/a-propos" },
					title: { en: "About", fr: "À propos" },
					intro: { en: "Who we are" },
					data: { en: "kept", fr: "as stored" },
					settings: [{ id: setting.data.id, collectionKey: "settings" }],
				},
				bricks: {
					builder: [
						{ key: "hero", fields: { heading: { en: "Hi", fr: "Salut" } } },
					],
					fixed: { seo: { summary: "Summary" } },
				},
			},
		});
		assert(page.data, JSON.stringify(page.error));
		pageId = page.data.id;
	});
	afterAll(() => fixture.destroy());

	/** A rich text paragraph linking to a document. */
	const linkTo = (collectionKey: string, documentId: number) => ({
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						text: "Link",
						marks: [
							{
								type: "link",
								attrs: { kind: "document", collectionKey, documentId },
							},
						],
					},
				],
			},
		],
	});
	const href = (href: string | null) => ({
		content: [{ content: [{ marks: [{ attrs: { href } }] }] }],
	});

	test("reads in one locale and fills in related documents, which use their own collection's default", async () => {
		const res = await toolkit.documents.getSingle({
			collectionKey: "pages",
			version: "latest",
			locale: "fr",
			query: {
				filter: { id: { value: pageId } },
				include: ["bricks"],
			},
		});
		assert(res.data, JSON.stringify(res.error));

		expect(res.data).toMatchObject({
			locale: "fr",
			route: {
				path: "/a-propos",
				alternates: { en: "/about", fr: "/a-propos" },
			},
			fields: {
				title: "À propos",
				data: { en: "kept", fr: "as stored" },
				settings: [
					{
						collectionKey: "settings",
						locale: "en",
						fields: { label: "Footer" },
					},
				],
			},
			bricks: [{ key: "hero", fields: { heading: "Salut" } }],
			fixed: { seo: { key: "seo", fields: { summary: "Summary" } } },
		});
		expect(res.data).not.toHaveProperty("refs");
	});

	test("fills empty translations from the fallback locale", async () => {
		const read = (fallbackLocale?: string) =>
			toolkit.documents.getSingle({
				collectionKey: "pages",
				version: "latest",
				locale: "fr",
				fallbackLocale,
				query: { filter: { id: { value: pageId } } },
			});

		expect((await read())?.data?.fields.intro).toBe("");
		expect((await read("en"))?.data?.fields.intro).toBe("Who we are");
	});

	test("leaves relations as their ID and collection at depth 0, with every translation without a locale", async () => {
		const res = await toolkit.documents.getSingle({
			collectionKey: "pages",
			version: "latest",
			depth: 0,
			query: { filter: { id: { value: pageId } } },
		});
		assert(res.data, JSON.stringify(res.error));

		expect(res.data.fields.title).toEqual({ en: "About", fr: "À propos" });
		expect(res.data.fields.settings).toEqual([
			{ id: expect.any(Number), collectionKey: "settings" },
		]);
		expect(res.data).not.toHaveProperty("locale");
	});

	test("lists documents as items with their pagination", async () => {
		const res = await toolkit.documents.getMultiple({
			collectionKey: "pages",
			version: "latest",
			query: { perPage: 1 },
		});
		assert(res.data, JSON.stringify(res.error));

		expect(res.data.items).toHaveLength(1);
		expect(res.data.pagination).toEqual({
			currentPage: 1,
			perPage: 1,
			total: 1,
			lastPage: 1,
		});
	});

	test("reads the locale as the content API parses it, and refuses ones the project doesn't have", async () => {
		const trimmed = await toolkit.documents.getSingle({
			collectionKey: "pages",
			version: "latest",
			locale: " fr ",
			query: { filter: { id: { value: pageId } } },
		});
		assert(trimmed.data, JSON.stringify(trimmed.error));
		expect(trimmed.data.fields.title).toBe("À propos");

		const unknown = await toolkit.documents.getMultiple({
			collectionKey: "pages",
			version: "latest",
			locale: "de",
		});
		expect(unknown.error?.status).toBe(400);
	});

	test("gives rich text links and document variables the fallback locale too", async () => {
		const target = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: { fields: { slug: { en: "/team" }, title: { en: "Team" } } },
		});
		assert(target.data, JSON.stringify(target.error));
		const reference = { collectionKey: "pages", documentId: target.data.id };
		const source = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: {
				fields: {
					slug: { en: "/links", fr: "/liens" },
					body: {
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: "Team",
										marks: [
											{
												type: "link",
												attrs: { kind: "document", ...reference },
											},
										],
									},
									{
										type: "lucidVariable",
										attrs: {
											source: "document",
											fieldKey: "title",
											...reference,
										},
									},
								],
							},
						],
					},
				},
			},
		});
		assert(source.data, JSON.stringify(source.error));
		const body = async (fallbackLocale?: string) => {
			const res = await toolkit.documents.getSingle({
				collectionKey: "pages",
				version: "latest",
				locale: "fr",
				fallbackLocale,
				depth: 0,
				query: { filter: { id: { value: source.data?.id } } },
			});
			assert(res.data, JSON.stringify(res.error));
			return res.data.fields.body;
		};
		const paragraph = (href: string | null, value: string | null) => ({
			content: [
				{
					content: [{ marks: [{ attrs: { href } }] }, { attrs: { value } }],
				},
			],
		});

		// Saved text fields keep their empty translations as "", as the fields themselves do.
		expect(await body()).toMatchObject(paragraph(null, ""));
		expect(await body("en")).toMatchObject(paragraph("/team", "Team"));
	});

	test("fills related documents in full to the depth, with their own relations and rich text", async () => {
		const create = async (collectionKey: string, fields: object) => {
			const res = await toolkit.documents.createSingle({
				collectionKey,
				actor: { type: "system" },
				data: { fields },
			});
			assert(res.data, JSON.stringify(res.error));
			return res.data.id;
		};
		const setting = await create("settings", { label: { en: "Header" } });
		const guide = await create("guides", { slug: { en: "/guide" } });
		const related = await create("pages", {
			slug: { en: "/b", fr: "/b-fr" },
			settings: [{ id: setting, collectionKey: "settings" }],
			body: linkTo("guides", guide),
		});
		const source = await create("pages", {
			slug: { en: "/a", fr: "/a-fr" },
			related: [{ id: related, collectionKey: "pages" }],
		});
		const read = async (depth: number) => {
			const res = await toolkit.documents.getSingle({
				collectionKey: "pages",
				version: "latest",
				locale: "fr",
				depth,
				query: { filter: { id: { value: source } } },
			});
			assert(res.data, JSON.stringify(res.error));
			return res.data.fields.related;
		};

		// The guide is only in English, so the French link uses its English route.
		expect(await read(2)).toMatchObject([
			{
				id: related,
				route: { path: "/b-fr" },
				fields: {
					settings: [{ id: setting, fields: { label: "Header" } }],
					body: href("/guide"),
				},
			},
		]);
		expect(await read(1)).toMatchObject([
			{ fields: { settings: [{ id: setting, collectionKey: "settings" }] } },
		]);
	});

	test("reads rich text references in the requested locale in collections without locales", async () => {
		const note = await toolkit.documents.createSingle({
			collectionKey: "notes",
			actor: { type: "system" },
			data: { fields: { body: linkTo("pages", pageId) } },
		});
		assert(note.data, JSON.stringify(note.error));
		const res = await toolkit.documents.getSingle({
			collectionKey: "notes",
			version: "latest",
			locale: "fr",
			query: { filter: { id: { value: note.data.id } } },
		});
		assert(res.data, JSON.stringify(res.error));

		expect(res.data.fields.body).toMatchObject(href("/a-propos"));
	});

	test("reads each translation's links in the linked collection's locale when returning every translation", async () => {
		const guide = await toolkit.documents.createSingle({
			collectionKey: "guides",
			actor: { type: "system" },
			data: { fields: { slug: { en: "/guide-en" } } },
		});
		assert(guide.data, JSON.stringify(guide.error));
		const link = linkTo("guides", guide.data.id);
		const page = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: {
				fields: {
					slug: { en: "/summary", fr: "/resume" },
					summary: { en: link, fr: link },
				},
			},
		});
		assert(page.data, JSON.stringify(page.error));
		const res = await toolkit.documents.getSingle({
			collectionKey: "pages",
			version: "latest",
			query: { filter: { id: { value: page.data.id } } },
		});
		assert(res.data, JSON.stringify(res.error));

		// The guide is only in English, so the French translation links to its English route too.
		expect(res.data.fields.summary).toMatchObject({
			en: href("/guide-en"),
			fr: href("/guide-en"),
		});
	});

	test("reads a revision's related documents against latest", async () => {
		const setting = await toolkit.documents.createSingle({
			collectionKey: "settings",
			actor: { type: "system" },
			data: { fields: { label: { en: "Sidebar" } } },
		});
		assert(setting.data, JSON.stringify(setting.error));
		const article = await toolkit.documents.createSingle({
			collectionKey: "articles",
			actor: { type: "system" },
			data: {
				fields: {
					settings: [{ id: setting.data.id, collectionKey: "settings" }],
				},
			},
		});
		assert(article.data, JSON.stringify(article.error));
		//* Saving again keeps the first save as a revision.
		const updated = await toolkit.documents.updateSingle({
			collectionKey: "articles",
			id: article.data.id,
			actor: { type: "system" },
			data: { fields: { settings: [] } },
		});
		assert(updated.data, JSON.stringify(updated.error));
		const tables = await getTableNames(context, "articles");
		assert(tables.data, JSON.stringify(tables.error));
		const revision = await context.db.kysely
			.selectFrom(tables.data.version)
			.select("id")
			.where("document_id", "=", article.data.id)
			.where("type", "=", "revision")
			.executeTakeFirstOrThrow();

		const res = await getContentDocument(context, {
			collectionKey: "articles",
			versionType: "revision",
			versionId: revision.id,
			query: { filter: { id: { value: article.data.id } } },
		});
		assert(res.data, JSON.stringify(res.error));
		expect(res.data).toMatchObject({
			fields: { settings: [{ fields: { label: { en: "Sidebar" } } }] },
		});
	});

	test("reads a related document in each version its sources map it to", async () => {
		const user = await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: `${randomUUID()}@example.test`,
				username: randomUUID(),
				secret: "test",
				super_admin: true,
			})
			.returning(["id", "email", "username"])
			.executeTakeFirstOrThrow();
		const publisher = { ...user, superAdmin: true, permissions: [] };
		const save = async (
			collectionKey: string,
			fields: object,
			publishTo: string[],
			id?: number,
		) => {
			const input = {
				collectionKey,
				actor: { type: "system" as const },
				data: { fields },
			};
			const res = id
				? await toolkit.documents.updateSingle({ ...input, id })
				: await toolkit.documents.createSingle(input);
			assert(res.data, JSON.stringify(res.error));
			for (const environment of publishTo) {
				const published = await publish(context, {
					collectionKey,
					documentId: res.data.id,
					environment,
					user: publisher,
				});
				assert(!published.error, JSON.stringify(published.error));
			}
			return res.data.id;
		};
		const label = await save("labels", { name: "Staging name" }, ["staging"]);
		await save("labels", { name: "Production name" }, ["production"], label);
		const card = await save(
			"cards",
			{ label: [{ id: label, collectionKey: "labels" }] },
			["production"],
		);
		const board = await save(
			"boards",
			{
				label: [{ id: label, collectionKey: "labels" }],
				card: [{ id: card, collectionKey: "cards" }],
			},
			["production"],
		);

		const res = await toolkit.documents.getSingle({
			collectionKey: "boards",
			version: "production",
			depth: 2,
			query: { filter: { id: { value: board } } },
		});
		assert(res.data, JSON.stringify(res.error));
		// Boards read labels from staging, while cards read them from production.
		expect(res.data.fields).toMatchObject({
			label: [{ fields: { name: "Staging name" } }],
			card: [{ fields: { label: [{ fields: { name: "Production name" } }] } }],
		});
	});

	test("falls back by field type, keeping populated JSON and filling empty rich text", async () => {
		const doc = (text: string) => ({
			type: "doc",
			content: [{ type: "paragraph", content: [{ type: "text", text }] }],
		});
		const page = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: {
				fields: {
					slug: { en: "/blocks", fr: "/blocs" },
					block: {
						en: { type: "card", title: "English card" },
						fr: { type: "card", title: "French card" },
					},
					summary: {
						en: doc("English summary"),
						fr: { type: "doc", content: [] },
					},
				},
			},
		});
		assert(page.data, JSON.stringify(page.error));
		const res = await toolkit.documents.getSingle({
			collectionKey: "pages",
			version: "latest",
			locale: "fr",
			fallbackLocale: "en",
			query: { filter: { id: { value: page.data.id } } },
		});
		assert(res.data, JSON.stringify(res.error));

		expect(res.data.fields.block).toEqual({
			type: "card",
			title: "French card",
		});
		expect(res.data.fields.summary).toMatchObject(doc("English summary"));
	});
});

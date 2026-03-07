import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import inferSchema from "./infer-schema.js";

// -----------------------------------------------
// Setup and Teardown

describe("Schema inference", async () => {
	let pagesCollection: CollectionBuilder;
	const db = new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	});

	beforeEach(() => {
		pagesCollection = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
			bricks: {
				fixed: [
					new BrickBuilder("hero").addText("title").addRichText("content"),
				],
			},
		});
	});
	afterAll(() => {
		db.client.destroy();
	});

	test("infers basic document table structure", () => {
		const res = inferSchema(pagesCollection, db);
		expect(res.data?.tables[0]).toMatchObject({
			name: "lucid_document__pages",
			type: "document",
		});
	});

	test("infers version table structure", () => {
		const res = inferSchema(pagesCollection, db);
		expect(res.data?.tables[1]).toMatchObject({
			name: "lucid_document__pages__ver",
			type: "versions",
		});
	});

	test("correctly handles repeater fields", () => {
		pagesCollection.addRepeater("authors").addUser("author").endRepeater();

		const res = inferSchema(pagesCollection, db);
		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__fld__rep__authors",
				type: `${constants.db.customFieldTablePrefix}repeater`,
				key: expect.objectContaining({
					fieldPath: ["authors"],
				}),
			}),
		);
	});

	test("correctly handles nested repeater fields", () => {
		pagesCollection
			.addRepeater("authors")
			.addRepeater("books")
			.addText("title")
			.endRepeater()
			.endRepeater();

		const res = inferSchema(pagesCollection, db);
		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__fld__rep__authors__books",
				type: `${constants.db.customFieldTablePrefix}repeater`,
				key: expect.objectContaining({
					fieldPath: ["authors", "books"],
				}),
			}),
		);
	});

	test("creates relation tables for media, user and document fields", () => {
		pagesCollection
			.addMedia("hero_media")
			.addUser("author")
			.addDocument("related_page", {
				collection: "pages",
			});

		const res = inferSchema(pagesCollection, db);
		const mediaTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__med__hero_media",
		);
		const userTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__usr__author",
		);
		const documentTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__doc__related_page",
		);

		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__fld__med__hero_media",
				type: `${constants.db.customFieldTablePrefix}media`,
				key: expect.objectContaining({
					fieldPath: ["hero_media"],
				}),
			}),
		);
		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__fld__usr__author",
				type: `${constants.db.customFieldTablePrefix}user`,
				key: expect.objectContaining({
					fieldPath: ["author"],
				}),
			}),
		);
		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__fld__doc__related_page",
				type: `${constants.db.customFieldTablePrefix}document`,
				key: expect.objectContaining({
					fieldPath: ["related_page"],
				}),
			}),
		);
		expect(
			mediaTable?.columns.some((column) => column.name === "is_open"),
		).toBe(false);
		expect(userTable?.columns.some((column) => column.name === "is_open")).toBe(
			false,
		);
		expect(
			documentTable?.columns.some((column) => column.name === "is_open"),
		).toBe(false);
		expect(
			mediaTable?.columns.some((column) => column.name === "parent_id_ref"),
		).toBe(false);
		expect(
			userTable?.columns.some((column) => column.name === "parent_id_ref"),
		).toBe(false);
		expect(
			documentTable?.columns.some((column) => column.name === "parent_id_ref"),
		).toBe(false);
	});

	test("keeps relation tables top-level when fields are nested in repeater groups", () => {
		pagesCollection
			.addRepeater("authors")
			.addMedia("avatar")
			.addRepeater("socials")
			.addUser("owner")
			.endRepeater()
			.endRepeater();

		const res = inferSchema(pagesCollection, db);
		const tableNames = res.data?.tables.map((table) => table.name) ?? [];

		expect(tableNames).toContain("lucid_document__pages__fld__med__avatar");
		expect(tableNames).toContain("lucid_document__pages__fld__usr__owner");
		expect(tableNames).not.toContain(
			"lucid_document__pages__fld__rep__authors__med__avatar",
		);
		expect(tableNames).not.toContain(
			"lucid_document__pages__fld__rep__authors__socials__usr__owner",
		);
	});

	test("keeps brick relation tables top-level when fields are nested in repeater groups", () => {
		const brickScopedCollection = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
			bricks: {
				fixed: [
					new BrickBuilder("content")
						.addRepeater("authors")
						.addMedia("avatar")
						.endRepeater(),
				],
			},
		});

		const res = inferSchema(brickScopedCollection, db);
		const tableNames = res.data?.tables.map((table) => table.name) ?? [];

		expect(tableNames).toContain("lucid_document__pages__content__med__avatar");
		expect(tableNames).not.toContain(
			"lucid_document__pages__content__rep__authors__med__avatar",
		);
	});

	test("creates brick tables", () => {
		const res = inferSchema(pagesCollection, db);
		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__hero",
				type: "brick",
				key: expect.objectContaining({
					brick: "hero",
				}),
			}),
		);
	});

	test("ignores ui-only fields during schema inference", () => {
		const brickScopedCollection = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
			bricks: {
				fixed: [new BrickBuilder("content").addTab("meta").addText("title")],
			},
		});

		const res = inferSchema(brickScopedCollection, db);
		const tableNames = res.data?.tables.map((table) => table.name) ?? [];

		expect(tableNames).toContain("lucid_document__pages__content");
		expect(tableNames).not.toContain("lucid_document__pages__content__meta");

		const brickTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__content",
		);
		expect(brickTable?.columns).toContainEqual(
			expect.objectContaining({
				name: "_title",
				source: "field",
			}),
		);
	});

	test("marks generated custom field columns as non-removable", () => {
		const res = inferSchema(pagesCollection, db);
		const generatedFieldColumn = res.data?.tables
			.flatMap((table) => table.columns)
			.find((column) => column.source === "field");

		expect(generatedFieldColumn).toBeDefined();
		expect(generatedFieldColumn?.name.startsWith("_")).toBe(true);
		expect(generatedFieldColumn?.canAutoRemove).toBe(false);
	});
});

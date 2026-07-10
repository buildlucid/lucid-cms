import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import inferSchema from "./infer-schema.js";

// -----------------------------------------------
// Setup and Teardown

describe("Schema inference", async () => {
	let pagesCollection: CollectionBuilder;
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	beforeEach(() => {
		pagesCollection = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
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

	test("creates relation tables for media, user, relation and range fields", () => {
		pagesCollection
			.addMedia("hero_media")
			.addUser("author")
			.addRelation("related_page", {
				collection: "pages",
			})
			.addRange("price_range", { thumbs: 2, step: 0.5 });

		const res = inferSchema(pagesCollection, db);
		const mediaTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__med__hero_media",
		);
		const userTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__usr__author",
		);
		const relationTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__rel__related_page",
		);
		const rangeTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__rng__price_range",
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
				name: "lucid_document__pages__fld__rng__price_range",
				type: `${constants.db.customFieldTablePrefix}range`,
				key: expect.objectContaining({
					fieldPath: ["price_range"],
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
				name: "lucid_document__pages__fld__rel__related_page",
				type: `${constants.db.customFieldTablePrefix}relation`,
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
			relationTable?.columns.some((column) => column.name === "is_open"),
		).toBe(false);
		expect(
			rangeTable?.columns.some((column) => column.name === "is_open"),
		).toBe(false);
		expect(rangeTable?.columns).toContainEqual(
			expect.objectContaining({ name: "_value", type: "real" }),
		);
		expect(
			mediaTable?.columns.some((column) => column.name === "parent_id_ref"),
		).toBe(false);
		expect(
			userTable?.columns.some((column) => column.name === "parent_id_ref"),
		).toBe(false);
		expect(
			relationTable?.columns.some((column) => column.name === "parent_id_ref"),
		).toBe(false);
		expect(
			relationTable?.columns.find((column) => column.name === "_document_id")
				?.foreignKey,
		).toBeUndefined();
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
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
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
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
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

	test("creates column field indexes from explicit config", () => {
		pagesCollection.addText("title", {
			index: true,
		});

		const res = inferSchema(pagesCollection, db);
		const fieldsTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld",
		);

		expect(fieldsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["_title"],
				source: "field",
			}),
		);
		expect(fieldsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["_title", "document_id"],
				source: "field",
			}),
		);
	});

	test("creates column field indexes from listing", () => {
		pagesCollection.addText("title", {
			showInList: true,
		});

		const res = inferSchema(pagesCollection, db);
		const fieldsTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld",
		);

		expect(fieldsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["_title"],
				source: "field",
			}),
		);
		expect(fieldsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["_title", "document_id"],
				source: "field",
			}),
		);
	});

	test("does not create column field indexes by default", () => {
		pagesCollection.addText("title");

		const res = inferSchema(pagesCollection, db);
		const fieldsTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld",
		);

		expect(
			fieldsTable?.indexes?.filter((index) => index.source === "field") ?? [],
		).toEqual([]);
	});

	test("creates composite relation lookup index for relation fields", () => {
		pagesCollection.addRelation("related_page", {
			collection: ["pages", "blog"],
		});

		const res = inferSchema(pagesCollection, db);
		const relationTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__rel__related_page",
		);

		expect(relationTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["_collection_key", "_document_id"],
				source: "field",
			}),
		);
	});

	test("creates core lookup indexes for generated collection tables", () => {
		pagesCollection.addRepeater("links").addText("label").endRepeater();

		const res = inferSchema(pagesCollection, db);
		const documentTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages",
		);
		const versionsTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__ver",
		);
		const fieldsTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld",
		);
		const repeaterTable = res.data?.tables.find(
			(table) => table.name === "lucid_document__pages__fld__rep__links",
		);

		expect(documentTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["is_deleted", "updated_at"],
				source: "core",
			}),
		);
		expect(versionsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["document_id", "type"],
				source: "core",
			}),
		);
		expect(fieldsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["document_version_id"],
				source: "core",
			}),
		);
		expect(fieldsTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["document_id", "document_version_id"],
				source: "core",
			}),
		);
		expect(repeaterTable?.indexes).toContainEqual(
			expect.objectContaining({
				columns: ["parent_id"],
				source: "core",
			}),
		);
	});
});

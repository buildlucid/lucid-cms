import { expect, test, describe, beforeEach, afterAll } from "vitest";
import Database from "better-sqlite3";
import BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import inferSchema from "./infer-schema.js";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";

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
					new BrickBuilder("hero").addText("title").addWysiwyg("content"),
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
			name: "lucid_document__pages__versions",
			type: "versions",
		});
	});

	test("correctly handles repeater fields", () => {
		pagesCollection.addRepeater("authors").addUser("author").endRepeater();

		const res = inferSchema(pagesCollection, db);
		expect(res.data?.tables).toContainEqual(
			expect.objectContaining({
				name: "lucid_document__pages__fields__authors",
				type: "repeater",
				key: expect.objectContaining({
					repeater: ["authors"],
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
				name: "lucid_document__pages__fields__authors__books",
				type: "repeater",
				key: expect.objectContaining({
					repeater: ["authors", "books"],
				}),
			}),
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
});

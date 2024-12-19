import { expect, test, describe, beforeEach } from "vitest";
import { BrickBuilder, CollectionBuilder } from "../../../builders.js";
import inferSchema from "./infer-schema.js";

describe("Schema inference", () => {
	let pagesCollection: CollectionBuilder;

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

	test("infers basic document table structure", () => {
		const res = inferSchema(pagesCollection, { dbAdapter: 0 });
		expect(res.data?.tables[0]).toMatchObject({
			name: "lucid_document__pages",
			type: "document",
		});
	});

	test("infers version table structure", () => {
		const res = inferSchema(pagesCollection, { dbAdapter: 0 });
		expect(res.data?.tables[1]).toMatchObject({
			name: "lucid_document__pages__versions",
			type: "versions",
		});
	});

	test("correctly handles repeater fields", () => {
		pagesCollection.addRepeater("authors").addUser("author").endRepeater();

		const res = inferSchema(pagesCollection, { dbAdapter: 0 });
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

		const res = inferSchema(pagesCollection, { dbAdapter: 0 });
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
		const res = inferSchema(pagesCollection, { dbAdapter: 0 });
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

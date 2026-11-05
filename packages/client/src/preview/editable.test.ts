import { describe, expect, test } from "vitest";
import { decodeEditMarkup } from "../contract.js";
import { editable } from "./editable.js";

const targetOf = (source: unknown, field?: string) => {
	const value = editable(source, field)["data-lucid-edit"];
	return value ? decodeEditMarkup(value) : null;
};

const base = { collectionKey: "page", documentId: 2, locale: "en" };
const brick = { type: "builder", key: "hero", ref: "hero-ref" } as const;

/** A document as a preview read returns it, with the marks it adds. */
const readPage = () => ({
	id: 2,
	collectionKey: "page",
	$preview: { ...base, path: [] },
	fields: { title: "Home" },
	bricks: [
		{
			ref: "hero-ref",
			key: "hero",
			$preview: { ...base, brick, path: [] },
			fields: {
				items: [
					{
						heading: "First",
						$preview: { ...base, brick, path: ["items", { ref: "item-1" }] },
					},
				],
			},
		},
	],
});

describe("editable", () => {
	test("marks fields of documents, bricks and repeater items, and bricks and items themselves", () => {
		const page = readPage();
		const hero = page.bricks[0];

		expect(targetOf(page, "title")).toEqual({ ...base, path: ["title"] });
		expect(targetOf(hero)).toEqual({ ...base, brick, path: [] });
		expect(targetOf(hero?.fields.items[0], "heading")).toEqual({
			...base,
			brick,
			path: ["items", { ref: "item-1" }, "heading"],
		});
		//* a document has no target of its own
		expect(targetOf(page)).toBeNull();
	});

	test("keeps working on content that was serialised or spread, eg. into an island's props", () => {
		const item = JSON.parse(JSON.stringify(readPage())).bricks[0].fields
			.items[0];

		expect(targetOf({ ...item }, "heading")).toEqual({
			...base,
			brick,
			path: ["items", { ref: "item-1" }, "heading"],
		});
	});

	test("writes attributes to spread or to write into markup, and none for content read without a preview", () => {
		expect({ ...editable({ title: "Home" }, "title") }).toEqual({});
		expect(`<h1${editable({ title: "Home" }, "title")}>`).toBe("<h1>");

		const attributes = { ...editable(readPage(), "title") };
		expect(Object.keys(attributes)).toEqual(["data-lucid-edit"]);
		expect(`<h1${editable(readPage(), "title")}>`).toBe(
			`<h1 data-lucid-edit="${attributes["data-lucid-edit"]}">`,
		);
	});
});

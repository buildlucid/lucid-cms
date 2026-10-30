import { describe, expect, test } from "vitest";
import BrickBuilder from "../builders/brick-builder/index.js";
import CollectionBuilder from "../builders/collection-builder/index.js";
import filterReadableContent from "./filter-readable-content.js";
import filterReadableData from "./filter-readable-data.js";
import getContentAccess from "./get-content-access.js";
import getEmbeddedBrickAccess from "./get-embedded-brick-access.js";

const hidden = { read: true } as const;
const collection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: { embedded: [new BrickBuilder("quote").addText("text")] },
})
	.addRichText("body")
	.addRichText("notes", { permissions: hidden })
	.addCheckbox("promoted", { permissions: hidden })
	.addText("code", {
		ui: { condition: { all: [{ field: "promoted", value: true }] } },
	});
const access = getContentAccess(collection, {
	superAdmin: false,
	permissions: [],
});

/** A rich text document holding one embedded brick. */
const embedding = (ref: string) => ({
	type: "doc",
	content: [{ type: "lucidEmbeddedBrick", attrs: { ref } }],
});

describe("embedded bricks under hidden rich text", () => {
	test("are left out of document responses", () => {
		const filtered = filterReadableContent(access, {
			fields: [
				{ key: "body", type: "rich-text", value: embedding("shown") },
				{ key: "notes", type: "rich-text", value: embedding("private") },
			],
			bricks: ["shown", "private"].map((ref) => ({
				ref,
				key: "quote",
				type: "embedded",
				order: 0,
				fields: [{ key: "text", type: "text" as const, value: ref }],
			})),
		});

		expect(filtered.bricks?.map((brick) => brick.ref)).toEqual(["shown"]);
	});

	test("are left out of authoring values", () => {
		const filtered = filterReadableData(
			collection,
			access,
			{
				fields: { body: embedding("shown"), notes: embedding("private") },
				bricks: {
					fixed: {},
					builder: [],
					embedded: ["shown", "private"].map((ref) => ({
						ref,
						key: "quote",
						fields: { text: ref },
					})),
				},
			},
			{
				fields: [
					{ key: "body", type: "rich-text", value: embedding("shown") },
					{ key: "notes", type: "rich-text", value: embedding("private") },
				],
				bricks: ["shown", "private"].map((ref) => ({
					ref,
					key: "quote",
					type: "embedded",
					order: 0,
					fields: [{ key: "text", type: "text", value: ref }],
				})),
			},
		);

		expect(filtered.fields).toEqual({ body: embedding("shown") });
		expect(filtered.bricks.embedded.map((brick) => brick.ref)).toEqual([
			"shown",
		]);
	});
});

test("embedded bricks get the narrowest access of every field holding them", () => {
	const locked = new CollectionBuilder("pages", {
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		bricks: { embedded: [new BrickBuilder("quote").addText("text")] },
	})
		.addRichText("open")
		.addRichText("intro", { permissions: { update: true } })
		.addRichText("notes", { permissions: hidden });
	const lockedAccess = getContentAccess(locked, {
		superAdmin: false,
		permissions: [],
	});
	const quote = (ref: string) => ({
		ref,
		key: "quote",
		type: "embedded",
		fields: [],
	});

	expect(
		getEmbeddedBrickAccess(lockedAccess, {
			fields: [
				{ key: "open", type: "rich-text", value: embedding("a") },
				{ key: "intro", type: "rich-text", value: embedding("a") },
				{ key: "open", type: "rich-text", value: embedding("b") },
				{ key: "notes", type: "rich-text", value: embedding("b") },
			],
			bricks: [quote("a"), quote("b"), quote("unused")],
		}),
	).toEqual(
		new Map([
			["a", "locked"],
			["b", "hidden"],
		]),
	);
});

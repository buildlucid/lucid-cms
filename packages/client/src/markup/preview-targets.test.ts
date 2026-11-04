import { describe, expect, test } from "vitest";
import {
	getPreviewTarget,
	previewAttributes,
	recordPreviewTargets,
} from "./preview-targets.js";

const readPage = () => ({
	id: 2,
	collectionKey: "page",
	locale: "en",
	fields: {
		title: "Home",
		seo: { heading: "Welcome" },
		links: [{ label: "One" }, { label: "Two" }],
		related: [{ id: 7, collectionKey: "post", fields: { title: "Post" } }],
	},
	bricks: [
		{
			id: -1,
			ref: "hero-ref",
			key: "hero",
			order: 0,
			fields: { items: [{ heading: "First" }] },
		},
	],
	fixed: {
		seo: { id: -2, ref: "seo-ref", key: "seo", order: 0, fields: {} },
	},
});

describe("preview targets", () => {
	test("records where fields, bricks, repeater items and related documents are", () => {
		const page = readPage();
		const json = JSON.stringify(page);
		recordPreviewTargets(page);

		const hero = page.bricks[0];
		const base = { collectionKey: "page", documentId: 2, locale: "en" };
		const heroBrick = { type: "builder", key: "hero", ref: "hero-ref" };
		expect(getPreviewTarget(page, "title")).toEqual({
			...base,
			path: ["title"],
		});
		expect(getPreviewTarget(page.fields.seo, "heading")).toEqual({
			...base,
			path: ["seo", "heading"],
		});
		expect(getPreviewTarget(page.fields.links[1], "label")).toEqual({
			...base,
			path: ["links", 1, "label"],
		});
		expect(getPreviewTarget(page.fields.related[0], "title")).toEqual({
			collectionKey: "post",
			documentId: 7,
			locale: "en",
			path: ["title"],
		});
		expect(getPreviewTarget(hero)).toEqual({
			...base,
			brick: heroBrick,
			path: [],
		});
		expect(getPreviewTarget(hero?.fields.items[0], "heading")).toEqual({
			...base,
			brick: heroBrick,
			path: ["items", 0, "heading"],
		});
		expect(getPreviewTarget(page.fixed.seo, "canonical")?.brick).toEqual({
			type: "fixed",
			key: "seo",
			ref: "seo-ref",
		});
		//* a document has no target of its own, and the content itself is unchanged
		expect(getPreviewTarget(page)).toBeNull();
		expect(JSON.stringify(page)).toBe(json);
	});

	test("writes decodable attributes, and none for content read without a preview", () => {
		const page = readPage();
		expect(previewAttributes(page, "title")).toEqual({});

		recordPreviewTargets(page);
		const attribute = previewAttributes(page.bricks[0])[
			"data-lucid-preview-field"
		];
		expect(
			JSON.parse(decodeURIComponent(attribute?.slice(2) ?? "")).brick.ref,
		).toBe("hero-ref");
	});
});

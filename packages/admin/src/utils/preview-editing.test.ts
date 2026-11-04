import type { Collection } from "@types";
import { describe, expect, test } from "vitest";
import {
	getPreviewEditingDetails,
	getPreviewRepeaters,
	getPreviewTargetName,
} from "./preview-editing";

const literal = (value: string) => ({ type: "lucid.literal", value }) as const;

const collection = {
	fields: [
		{ type: "text", key: "title", details: { label: literal("Title") } },
		{
			type: "tab",
			key: "content",
			details: { label: literal("Content") },
			fields: [
				{
					type: "section",
					key: "seo",
					output: "nested",
					details: { label: literal("SEO") },
					fields: [
						{
							type: "text",
							key: "heading",
							details: { label: literal("Heading") },
						},
					],
				},
				{
					type: "collapsible",
					key: "more",
					output: "inline",
					details: { label: literal("More") },
					fields: [
						{
							type: "repeater",
							key: "links",
							details: { label: literal("Links") },
							fields: [
								{
									type: "text",
									key: "label",
									details: { label: literal("Label") },
								},
							],
						},
					],
				},
			],
		},
	],
	fixedBricks: [],
	builderBricks: [
		{
			key: "hero",
			details: {
				label: literal("Hero"),
				description: literal("Opening statement"),
			},
			fields: [{ type: "text", key: "title", details: {} }],
		},
	],
} as unknown as Collection;

describe("preview editing details", () => {
	test("names fields by the paths content responses use, and lists builder bricks", () => {
		const details = getPreviewEditingDetails(collection);

		expect(details.fields).toEqual([
			{ path: ["title"], label: "Title" },
			{ path: ["seo"], label: "SEO" },
			{ path: ["seo", "heading"], label: "Heading" },
			{ path: ["links"], label: "Links", repeater: true },
			{ path: ["links", "*", "label"], label: "Label" },
			{ brick: "hero", path: ["title"], label: "title" },
		]);
		expect(details.bricks).toEqual([
			{
				key: "hero",
				label: "Hero",
				description: "Opening statement",
				addable: true,
			},
		]);
	});

	test("names bricks and repeater items, and lists the repeaters for the page", () => {
		const details = getPreviewEditingDetails(collection);
		const page = { collectionKey: "page", documentId: 1 };
		const hero = { type: "builder", key: "hero", ref: "a" } as const;

		expect(
			getPreviewTargetName(details, { ...page, brick: hero, path: [] }),
		).toBe("Hero");
		expect(getPreviewTargetName(details, { ...page, path: ["links", 1] })).toBe(
			"Links 2",
		);
		expect(
			getPreviewTargetName(details, { ...page, path: ["links", 0, "label"] }),
		).toBe("Label");
		expect(getPreviewRepeaters(details)).toEqual([{ path: ["links"] }]);
	});
});

import type { Collection } from "@types";
import { describe, expect, test } from "vitest";
import type { BrickData } from "@/store/brickStore/brickStore";
import { getPreviewAgentFocus } from "./get-preview-agent-focus";

const collection = {
	fields: [
		{
			type: "section",
			key: "seo",
			output: "nested",
			fields: [{ type: "text", key: "title" }],
		},
	],
	fixedBricks: [{ key: "footer", fields: [{ type: "text", key: "note" }] }],
	builderBricks: [
		{
			key: "hero",
			fields: [
				{
					type: "collapsible",
					key: "more",
					output: "inline",
					fields: [
						{
							type: "repeater",
							key: "links",
							fields: [{ type: "text", key: "label" }],
						},
					],
				},
			],
		},
	],
} as unknown as Collection;

const bricks: BrickData[] = [
	{
		ref: "pseudo",
		key: "collection-pseudo-brick",
		order: -1,
		type: "collection-fields",
		open: true,
		fields: [],
	},
	{
		ref: "Xy12ab",
		key: "hero",
		order: 0,
		type: "builder",
		open: false,
		fields: [
			{
				key: "links",
				type: "repeater",
				groups: [
					{ ref: "second", order: 1, open: false, fields: [] },
					{ ref: "first", order: 0, open: false, fields: [] },
				],
			},
		],
	},
	{
		ref: "footer-ref",
		key: "footer",
		order: 0,
		type: "fixed",
		open: false,
		fields: [],
	},
];

const page = { collectionKey: "page", documentId: 1 };

describe("preview targets for the agent", () => {
	test("name builder bricks by ref, fixed ones by key, and items by ref, leaving out nested sections", () => {
		const focus = (
			target: Parameters<typeof getPreviewAgentFocus>[0]["target"],
		) => getPreviewAgentFocus({ target, collection, bricks, label: "Part" });
		const hero = { type: "builder", key: "hero", ref: "Xy12ab" } as const;

		expect(focus({ ...page, brick: hero, path: [] })).toEqual({
			brick: "Xy12ab",
			path: [],
			label: "Part",
		});
		expect(
			focus({
				...page,
				brick: hero,
				path: ["links", { ref: "second" }, "label"],
			}),
		).toEqual({
			brick: "Xy12ab",
			path: ["links", "second", "label"],
			label: "Part",
		});
		expect(
			focus({
				...page,
				brick: { type: "fixed", key: "footer", ref: "footer-ref" },
				path: ["note"],
			}),
		).toEqual({ brick: "footer", path: ["note"], label: "Part" });
		expect(focus({ ...page, path: ["seo", "title"] })).toEqual({
			path: ["title"],
			label: "Part",
		});
		expect(
			focus({ ...page, brick: hero, path: ["links", { ref: "removed" }] }),
		).toBeNull();
	});
});

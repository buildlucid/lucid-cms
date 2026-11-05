import type { Collection, InternalDocumentField } from "@types";
import { expect, test } from "vitest";
import type { BrickData } from "@/store/brickStore/brickStore";
import { getPreviewErrors } from "./preview-errors";

const collection = {
	fields: [
		{
			type: "section",
			key: "seo",
			output: "nested",
			fields: [{ type: "text", key: "heading" }],
		},
	],
	fixedBricks: [],
	builderBricks: [
		{
			key: "hero",
			fields: [
				{
					type: "repeater",
					key: "links",
					fields: [{ type: "text", key: "label" }],
				},
			],
		},
	],
} as unknown as Collection;

const message = { type: "lucid.literal", value: "Required" } as const;
const group = (ref: string, order: number) => ({
	ref,
	order,
	open: false,
	fields: [],
});
const bricks = [
	{
		ref: "fields",
		key: "collection-fields",
		order: 0,
		type: "collection-fields",
		open: true,
		fields: [],
	},
	{
		ref: "a",
		key: "hero",
		order: 1,
		type: "builder",
		open: true,
		fields: [
			{
				key: "links",
				type: "repeater",
				//* stored out of order, so items are found by their order
				groups: [group("second", 1), group("first", 0)],
			} as unknown as InternalDocumentField,
		],
	},
] satisfies BrickData[];

test("finds errors by content path, items by their ref, in the shown locale", () => {
	expect(
		getPreviewErrors({
			collection,
			bricks,
			fieldsErrors: [
				{ key: "heading", localeCode: "en", message },
				{ key: "heading", localeCode: "fr", message },
			],
			brickErrors: [
				{
					ref: "a",
					key: "hero",
					order: 1,
					fields: [
						{
							key: "links",
							localeCode: null,
							message,
							groupErrors: [
								{
									ref: "second",
									order: 1,
									fields: [{ key: "label", localeCode: "en", message }],
								},
							],
						},
					],
				},
			],
			locale: "en",
		}),
	).toEqual([
		{ path: ["seo", "heading"] },
		{
			brick: { type: "builder", key: "hero", ref: "a" },
			path: ["links", { ref: "second" }, "label"],
		},
	]);
});

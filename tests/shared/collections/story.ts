import { defineBrick, defineCollection, field, z } from "@lucidcms/core";
import everyField from "./every-field.ts";

export const STORY_KEY = "story";

/** A builder brick with plain fields and a rich text body. */
export const HeroBrick = defineBrick({
	key: "story-hero",
	details: { label: "Hero" },
	fields: [field.text("heading"), field.richText("body")],
});

/** A builder brick whose content is a repeater. */
export const ListBrick = defineBrick({
	key: "story-list",
	details: { label: "List" },
	fields: [
		field.repeater("entries", {
			fields: [field.text("label"), field.number("amount")],
		}),
	],
});

/** A fixed brick, which every story has exactly one of. */
export const SeoBrick = defineBrick({
	key: "story-seo",
	details: { label: "SEO" },
	fields: [field.text("meta_title"), field.textarea("meta_description")],
});

/**
 * The content model for document tests, which every setup registers. It has every field type,
 * nested repeaters, builder and fixed bricks, revisions and two environments with no review.
 */
const StoryCollection = defineCollection({
	key: STORY_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Story", plural: "Stories" },
	},
	revisions: true,
	fields: [
		field.text("title", {
			validation: { required: true, zod: z.string().min(1).max(128) },
			showInList: true,
			useAsLabel: true,
		}),
		...everyField(""),
		field.repeater("items", {
			fields: [
				field.text("item_title"),
				field.number("item_number"),
				field.repeater("nested_items", {
					fields: [field.text("nested_title")],
				}),
			],
		}),
	],
	bricks: {
		builder: [HeroBrick, ListBrick],
		fixed: [SeoBrick],
	},
	publishing: {
		environments: [
			{ key: "staging", label: "Staging" },
			{ key: "production", label: "Production", requires: ["staging"] },
		],
	},
});

export default StoryCollection;

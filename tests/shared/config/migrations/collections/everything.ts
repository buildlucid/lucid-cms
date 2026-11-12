import { defineBrick, defineCollection, field } from "@lucidcms/core";
import everyField from "../../collections/every-field.ts";

export const EVERYTHING_KEY = "mig-everything";

const EverythingBrick = defineBrick({
	key: "mig-all-brick",
	details: { label: "Everything" },
	fields: [
		...everyField("brick_"),
		field.repeater("brick_items", { fields: everyField("brick_item_") }),
	],
});

/**
 * Every field type as a collection field, inside nested repeaters and inside builder and fixed
 * bricks. It covers each column, table and index shape the collection migrations can produce.
 */
const EverythingCollection = defineCollection({
	key: EVERYTHING_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Everything", plural: "Everything" },
	},
	revisions: true,
	fields: [
		...everyField(""),
		field.section("section", { fields: [field.text("section_text")] }),
		field.repeater("items", {
			fields: [
				...everyField("item_"),
				field.repeater("nested_items", {
					fields: everyField("nested_item_"),
				}),
			],
		}),
	],
	bricks: {
		builder: [EverythingBrick],
		fixed: [EverythingBrick],
	},
});

export default EverythingCollection;

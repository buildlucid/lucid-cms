import { defineBrick, defineCollection, field } from "@lucidcms/core";
import PageCollection from "../../collections/page.ts";

export const EVERYTHING_KEY = "mig-everything";

/** One of every stored field type. `prefix` keeps keys unique where the set is used more than once. */
const everyField = (prefix: string) => [
	field.text(`${prefix}text`, { default: "Hello", index: true }),
	field.textarea(`${prefix}textarea`),
	field.richText(`${prefix}rich_text`),
	field.number(`${prefix}number`, { default: 7, index: true }),
	field.range(`${prefix}range`, { default: [25, 75], thumbs: 2 }),
	field.checkbox(`${prefix}checkbox`, { default: true }),
	field.select(`${prefix}select`, {
		options: [
			{ label: "First", value: "first" },
			{ label: "Second", value: "second" },
		],
		default: "first",
	}),
	field.color(`${prefix}color`),
	field.datetime(`${prefix}datetime`),
	field.json(`${prefix}json`),
	field.code(`${prefix}code`),
	field.link(`${prefix}link`),
	field.email(`${prefix}email`),
	field.media(`${prefix}media`),
	field.media(`${prefix}media_many`, { multiple: true }),
	field.user(`${prefix}user`),
	field.user(`${prefix}user_many`, { multiple: true }),
	field.relation(`${prefix}relation`, { collection: PageCollection.key }),
	field.relation(`${prefix}relation_many`, {
		collection: [PageCollection.key],
		multiple: true,
	}),
];

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

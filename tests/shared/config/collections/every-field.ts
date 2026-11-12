import { field } from "@lucidcms/core";
import PageCollection from "./page.ts";

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

export default everyField;

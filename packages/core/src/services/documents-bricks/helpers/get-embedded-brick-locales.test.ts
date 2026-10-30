import { expect, test } from "vitest";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import getEmbeddedBrickLocales from "./get-embedded-brick-locales.js";

const richText = (ref: string) => ({
	type: "doc",
	content: [{ type: "lucidEmbeddedBrick", attrs: { ref } }],
});

const collection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:tests.collections.blog.singularName", {
				defaultMessage: "Blog",
			}),
			plural: copy("admin:tests.collections.blog.name", {
				defaultMessage: "Blogs",
			}),
		},
	},
	localized: true,
	bricks: {
		embedded: [
			new BrickBuilder("callout")
				.addText("body")
				.addRichText("content", { localized: false }),
		],
	},
})
	.addRichText("localized_content")
	.addRichText("shared_content", { localized: false });

const callout = (ref: string, nestedRef?: string) => ({
	ref,
	key: "callout",
	order: 0,
	type: "embedded" as const,
	fields: nestedRef
		? [
				{
					key: "content",
					type: "rich-text" as const,
					value: richText(nestedRef),
				},
			]
		: [],
});

test("bricks in a localized field belong to the locale holding them, and nested bricks inherit it", () => {
	const locales = getEmbeddedBrickLocales({
		collection,
		localized: true,
		fields: [
			{
				key: "localized_content",
				type: "rich-text",
				translations: {
					en: richText("en-callout"),
					fr: richText("fr-callout"),
				},
			},
		],
		bricks: [
			callout("en-callout", "nested-callout"),
			callout("fr-callout"),
			callout("nested-callout"),
		],
	});

	expect(Object.fromEntries(locales)).toEqual({
		"en-callout": "en",
		"fr-callout": "fr",
		"nested-callout": "en",
	});
});

test("bricks in a non-localized field, or held by several locales, are shared by every locale", () => {
	const locales = getEmbeddedBrickLocales({
		collection,
		localized: true,
		fields: [
			{
				key: "shared_content",
				type: "rich-text",
				value: richText("shared-callout"),
			},
			{
				key: "localized_content",
				type: "rich-text",
				translations: {
					en: richText("copied-callout"),
					fr: richText("copied-callout"),
				},
			},
		],
		bricks: [callout("shared-callout"), callout("copied-callout")],
	});

	expect(Object.fromEntries(locales)).toEqual({
		"shared-callout": null,
		"copied-callout": null,
	});
});

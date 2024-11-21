import { expect, test } from "vitest";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import formatInsertFields from "./format-insert-fields.js";
import flattenFields from "./flatten-fields.js";
import constants from "../../../constants/constants.js";

const Brick = new BrickBuilder("brick")
	.addText("text_test")
	.addWysiwyg("wysiwyg_test")
	.addMedia("media_test")
	.addNumber("number_test")
	.addCheckbox("checkbox_test")
	.addSelect("select_test")
	.addTextarea("textarea_test")
	.addJSON("json_test")
	.addColour("colour_test")
	.addDateTime("datetime_test")
	.addLink("link_test")
	.addUser("user_test");

const Collection = new CollectionBuilder("collection", {
	mode: "multiple",
	title: "Pages",
	singular: "Page",
	useTranslations: true,
	bricks: {
		builder: [Brick],
	},
})
	.addText("page_title")
	.addRepeater("call_to_actions")
	.addText("cta_title")
	.endRepeater();

test("collection format insert fields", async () => {
	const collectionFlatten = flattenFields(
		[
			{
				key: "page_title",
				type: "text",
				translations: {
					en: "Homepage",
					fr: "Accueil",
				},
			},
			{
				key: "call_to_actions",
				type: "repeater",
				groups: [
					{
						id: "ref-group1",
						open: 0,
						fields: [
							{
								key: "cta_title",
								type: "text",
								translations: {
									en: "Call to action",
									fr: "Appel à action",
								},
							},
						],
					},
					{
						id: "ref-group2",
						open: 0,
						fields: [
							{
								key: "cta_title",
								type: "text",
								translations: {
									en: "Call to action",
									fr: "Appel à action",
								},
							},
						],
					},
				],
			},
		],
		{
			locales: [
				{
					label: "English",
					code: "en",
				},
				{
					label: "French",
					code: "fr",
				},
			],
			defaultLocale: "en",
		},
		Collection,
	);
	const collectionFieldsFormatted = formatInsertFields({
		brick: {
			id: 1,
			key: undefined,
			type: constants.brickTypes.collectionFields,
			fields: collectionFlatten.fields,
		},
		groups: collectionFlatten.groups.map((g, i) => ({
			group_id: i,
			ref: g.ref,
		})),
		collection: Collection,
	});
	expect(collectionFieldsFormatted).toEqual([
		{
			key: "page_title",
			type: "text",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "Homepage",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "page_title",
			type: "text",
			localeCode: "fr",
			collectionBrickId: 1,
			groupId: null,
			textValue: "Accueil",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "cta_title",
			type: "text",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: 0,
			textValue: "Call to action",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "cta_title",
			type: "text",
			localeCode: "fr",
			collectionBrickId: 1,
			groupId: 0,
			textValue: "Appel à action",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "cta_title",
			type: "text",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: 1,
			textValue: "Call to action",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "cta_title",
			type: "text",
			localeCode: "fr",
			collectionBrickId: 1,
			groupId: 1,
			textValue: "Appel à action",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
	]);
});

test("collection brick format insert fields for each custom field type", async () => {
	const brickFlatten = flattenFields(
		[
			{
				key: "text_test",
				type: "text",
				translations: {
					en: "Test",
				},
			},
			{
				key: "wysiwyg_test",
				type: "wysiwyg",
				value: "<h1>Test</h1>",
			},
			{
				key: "media_test",
				type: "media",
				value: 1,
			},
			{
				key: "number_test",
				type: "number",
				value: 1,
			},
			{
				key: "checkbox_test",
				type: "checkbox",
				value: 1,
			},
			{
				key: "select_test",
				type: "select",
				value: "option-1",
			},
			{
				key: "textarea_test",
				type: "textarea",
				value: "Test",
			},
			{
				key: "json_test",
				type: "json",
				value: "{}",
			},
			{
				key: "colour_test",
				type: "colour",
				value: "#000000",
			},
			{
				key: "datetime_test",
				type: "datetime",
				value: "2022-01-01T00:00:00.000Z",
			},
			{
				key: "link_test",
				type: "link",
				value: {
					url: "https://example.com",
					label: "Example",
					target: "_blank",
				},
			},
			{
				key: "user_test",
				type: "user",
				value: 1,
			},
		],
		{
			locales: [
				{
					label: "English",
					code: "en",
				},
			],
			defaultLocale: "en",
		},
		Collection,
	);
	const bricksFormatted = formatInsertFields({
		brick: {
			id: 1,
			key: "brick",
			type: constants.brickTypes.builder,
			fields: brickFlatten.fields,
		},
		groups: [],
		collection: Collection,
	});

	expect(bricksFormatted).toEqual([
		{
			key: "text_test",
			type: "text",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "Test",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "wysiwyg_test",
			type: "wysiwyg",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "<h1>Test</h1>",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "media_test",
			type: "media",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: null,
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: 1,
			userId: null,
		},
		{
			key: "number_test",
			type: "number",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: null,
			intValue: 1,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "checkbox_test",
			type: "checkbox",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: null,
			intValue: null,
			boolValue: 1,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "select_test",
			type: "select",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "option-1",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "textarea_test",
			type: "textarea",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "Test",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "json_test",
			type: "json",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: null,
			intValue: null,
			boolValue: null,
			jsonValue: '"{}"',
			mediaId: null,
			userId: null,
		},
		{
			key: "colour_test",
			type: "colour",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "#000000",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "datetime_test",
			type: "datetime",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "2022-01-01T00:00:00.000Z",
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: null,
		},
		{
			key: "link_test",
			type: "link",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: "https://example.com",
			intValue: null,
			boolValue: null,
			jsonValue: '{"target":"_blank","label":"Example"}',
			mediaId: null,
			userId: null,
		},
		{
			key: "user_test",
			type: "user",
			localeCode: "en",
			collectionBrickId: 1,
			groupId: null,
			textValue: null,
			intValue: null,
			boolValue: null,
			jsonValue: null,
			mediaId: null,
			userId: 1,
		},
	]);
});

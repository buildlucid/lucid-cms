import { expect, test } from "vitest";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import flattenFields from "../helpers/flatten-fields.js";
import { validateBrick } from "./check-validate-bricks-fields.js";

const CONSTANTS = {
	localisation: {
		locales: [
			{
				label: "English",
				code: "en",
			},
			{
				label: "French",
				code: "fr",
			},
			{
				label: "German",
				code: "de",
			},
			{
				label: "Spanish",
				code: "es",
			},
		],
		defaultLocale: "en",
	},
	collectionBrickId: "collection-pseudo-brick",
};

test("validate brick along with brick field validation", async () => {
	const Collection = new CollectionBuilder("collection", {
		mode: "multiple",
		details: {
			name: "Test",
			singularName: "Test",
		},
		config: {
			useTranslations: true,
		},
	})
		.addText("text_test")
		.addWysiwyg("wysiwyg_test")
		.addMedia("media_test")
		.addNumber("number_test")
		.addCheckbox("checkbox_test")
		.addSelect("select_test", {
			options: [
				{
					label: "Option 1",
					value: "option-1",
				},
			],
		})
		.addTextarea("textarea_test")
		.addJSON("json_test")
		.addColour("colour_test")
		.addDateTime("datetime_test")
		.addLink("link_test")
		.addUser("user_test")
		.addRepeater("test_repeater")
		.addText("test_repeater_text")
		// TODO: add test for document custom field
		.endRepeater();

	const flatten = flattenFields(
		[
			{
				key: "text_test",
				type: "text",
				translations: {
					en: "Homepage",
					fr: "Accueil",
				},
			},
			{
				key: "wysiwyg_test",
				type: "wysiwyg",
				value: "<h1>Heading</h1><p>Body</p>",
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
				value: "Test textarea",
			},
			{
				key: "json_test",
				type: "json",
				value: {
					key: "value",
				},
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
					target: "_blank",
					label: "Link 1",
				},
			},
			{
				key: "user_test",
				type: "user",
				value: 1,
			},
			{
				key: "test_repeater",
				type: "repeater",
				groups: [
					{
						id: "ref-group1",
						open: false,
						fields: [
							{
								key: "test_repeater_text",
								type: "text",
								translations: {
									en: "Test repeater text",
								},
							},
						],
					},
					{
						id: "ref-group2",
						open: false,
						fields: [
							{
								key: "test_repeater_text",
								type: "text",
								translations: {
									en: "Test repeater text",
								},
							},
						],
					},
				],
			},
		],
		CONSTANTS.localisation,
		Collection,
	);

	const validateRes = validateBrick({
		brick: {
			id: CONSTANTS.collectionBrickId,
			type: "collection-fields",
			fields: flatten.fields,
			groups: flatten.groups,
		},
		collection: Collection,
		data: {
			media: [
				{
					id: 1,
					type: "image",
					width: 1024,
					height: 768,
					file_extension: "png",
				},
			],
			users: [
				{
					id: 1,
				},
			],
			documents: [],
		},
	});

	expect(validateRes.length).toBe(0);
});

// TODO: add test for failing validation

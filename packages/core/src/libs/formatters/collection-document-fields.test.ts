import { expect, test } from "vitest";
import type { FieldProp } from "./collection-document-fields.js";
import type { BrickProp } from "./collection-document-bricks.js";
import BrickBuilder from "../builders/brick-builder/index.js";
import CollectionDocumentFieldsFormatter from "./collection-document-fields.js";

const BannerBrick = new BrickBuilder("banner", {
	details: {
		name: {
			en: "Banner",
		},
		summary: "A banner with a title and intro text",
	},
	preview: {
		image: "https://headless-dev.up.railway.app/public/banner-brick.png",
	},
})
	.addTab("content_tab", {
		details: {
			label: "Content",
		},
	})
	.addText("title", {
		details: {
			summary: "The title of the banner. This is displayed as an H1 tag.",
		},
		validation: {
			required: true,
		},
	})
	.addWysiwyg("intro")
	.addRepeater("call_to_actions", {
		details: {
			label: "Call to Actions",
		},
		validation: {
			maxGroups: 3,
		},
	})
	.addLink("link", {
		details: {
			label: "Link",
		},
	})
	.endRepeater()
	.addTab("config_tab", {
		details: {
			label: "Config",
		},
	})
	.addCheckbox("full_width", {
		details: {
			summary: "Make the banner fullwidth",
		},
	});

const fields: FieldProp[] = [
	{
		fields_id: 199,
		collection_brick_id: 107,
		group_id: null,
		locale_code: "fr",
		key: "title",
		type: "text",
		text_value: "Title FR",
		int_value: null,
		bool_value: null,
		json_value: null,
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
	{
		fields_id: 200,
		collection_brick_id: 107,
		group_id: null,
		locale_code: "en",
		key: "title",
		type: "text",
		text_value: "Test",
		int_value: null,
		bool_value: null,
		json_value: null,
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
	{
		fields_id: 201,
		collection_brick_id: 107,
		group_id: null,
		locale_code: "fr",
		key: "intro",
		type: "wysiwyg",
		text_value: "",
		int_value: null,
		bool_value: null,
		json_value: null,
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
	{
		fields_id: 202,
		collection_brick_id: 107,
		group_id: null,
		locale_code: "en",
		key: "intro",
		type: "wysiwyg",
		text_value: "<h1>Heading</h1><p>Body</p>",
		int_value: null,
		bool_value: null,
		json_value: null,
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
	{
		fields_id: 203,
		collection_brick_id: 107,
		group_id: 3,
		locale_code: "en",
		key: "link",
		type: "link",
		text_value: "https://example.com",
		int_value: null,
		bool_value: null,
		json_value: '{ target: "_self", label: "Link 1" }',
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
	{
		fields_id: 204,
		collection_brick_id: 107,
		group_id: 4,
		locale_code: "en",
		key: "link",
		type: "link",
		text_value: "https://example.com",
		int_value: null,
		bool_value: null,
		json_value: '{ target: "_blank", label: "Link 2" }',
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
	{
		fields_id: 205,
		collection_brick_id: 107,
		group_id: null,
		locale_code: "en",
		key: "full_width",
		type: "checkbox",
		text_value: null,
		int_value: null,
		bool_value: false,
		json_value: null,
		media_id: null,
		collection_document_version_id: 1,
		user_id: null,
		user_email: null,
		user_first_name: null,
		user_last_name: null,
		user_username: null,
		media_key: null,
		media_mime_type: null,
		media_file_extension: null,
		media_file_size: null,
		media_width: null,
		media_height: null,
		media_type: null,
		media_blur_hash: null,
		media_average_colour: null,
		media_is_dark: null,
		media_is_light: null,
		media_title_translations: [],
		media_alt_translations: [],
	},
];
const groups: BrickProp["groups"] = [
	{
		group_id: 3,
		collection_document_version_id: 1,
		collection_brick_id: 107,
		parent_group_id: null,
		repeater_key: "call_to_actions",
		group_order: 0,
		group_open: true,
		ref: "9295f118-8d43-4610-a5ff-7c66e315f8d7",
	},
	{
		group_id: 4,
		collection_document_version_id: 1,
		collection_brick_id: 107,
		parent_group_id: null,
		repeater_key: "call_to_actions",
		group_order: 1,
		group_open: true,
		ref: "cbc4c6f0-3658-4c88-9acf-88290f6d1121",
	},
];

test("document field formatter success with translation support", async () => {
	const formatter = new CollectionDocumentFieldsFormatter();
	const result = formatter.formatMultiple(
		{
			fields: fields,
			groups: groups,
		},
		{
			builder: BannerBrick,
			host: "http://localhost:8080",
			collectionTranslations: true,
			localisation: {
				locales: ["en", "fr"],
				default: "en",
			},
			collections: [],
		},
	);

	expect(result).toEqual([
		{
			key: "title",
			type: "text",
			translations: { fr: "Title FR", en: "Test" },
			meta: { fr: null, en: null },
			groupId: undefined,
		},
		{
			key: "intro",
			type: "wysiwyg",
			translations: { fr: "", en: "<h1>Heading</h1><p>Body</p>" },
			meta: { fr: null, en: null },
			groupId: undefined,
		},
		{
			key: "call_to_actions",
			type: "repeater",
			groups: [
				{
					id: 3,
					order: 0,
					open: true,
					fields: [
						{
							key: "link",
							type: "link",
							groupId: 3,
							value: { url: null, label: null, target: null },
							meta: null,
						},
					],
				},
				{
					id: 4,
					order: 1,
					open: true,
					fields: [
						{
							key: "link",
							type: "link",
							groupId: 4,
							value: { url: null, label: null, target: null },
							meta: null,
						},
					],
				},
			],
		},
		{
			key: "full_width",
			type: "checkbox",
			groupId: undefined,
			value: false,
			meta: null,
		},
	]);
});

test("document field formatter success with translation disabled", async () => {
	const formatter = new CollectionDocumentFieldsFormatter();
	const resultEn = formatter.formatMultiple(
		{
			fields: fields,
			groups: groups,
		},
		{
			builder: BannerBrick,
			host: "http://localhost:8080",
			collectionTranslations: false,
			localisation: {
				locales: ["en", "fr"],
				default: "en",
			},
			collections: [],
		},
	);

	const resultFr = formatter.formatMultiple(
		{
			fields: fields,
			groups: groups,
		},
		{
			builder: BannerBrick,
			host: "http://localhost:8080",
			collectionTranslations: false,
			localisation: {
				locales: ["en", "fr"],
				default: "fr",
			},
			collections: [],
		},
	);

	expect(resultEn[0]).toEqual({
		key: "title",
		type: "text",
		groupId: undefined,
		value: "Test",
		meta: null,
	});

	expect(resultFr[0]).toEqual({
		key: "title",
		type: "text",
		groupId: undefined,
		value: "Title FR",
		meta: null,
	});
});

test("document field flat formatter success with translation support", async () => {
	const formatter = new CollectionDocumentFieldsFormatter();
	const result = formatter.formatMultipleFlat(
		{
			fields: fields,
		},
		{
			builder: BannerBrick,
			host: "http://localhost:8080",
			collectionTranslations: true,
			localisation: {
				locales: ["en", "fr"],
				default: "en",
			},
			collections: [],
		},
	);

	expect(result).toEqual([
		{
			key: "title",
			type: "text",
			translations: { fr: "Title FR", en: "Test" },
			meta: { fr: null, en: null },
			groupId: undefined,
		},
		{
			key: "intro",
			type: "wysiwyg",
			translations: { fr: "", en: "<h1>Heading</h1><p>Body</p>" },
			meta: { fr: null, en: null },
			groupId: undefined,
		},
		{
			key: "link",
			type: "link",
			groupId: 3,
			value: { url: null, label: null, target: null },
			meta: null,
		},
		{
			key: "full_width",
			type: "checkbox",
			groupId: undefined,
			value: false,
			meta: null,
		},
	]);
});

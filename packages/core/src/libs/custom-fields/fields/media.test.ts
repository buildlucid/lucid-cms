import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import MediaCustomField from "./media.js";

// -----------------------------------------------
// Validation
const MediaCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addMedia("standard_media")
	.addMedia("required_media", {
		validation: {
			required: true,
		},
	})
	.addMedia("min_width_media", {
		validation: {
			width: {
				min: 100,
			},
		},
	})
	.addMedia("max_width_media", {
		validation: {
			width: {
				max: 200,
			},
		},
	})
	.addMedia("min_height_media", {
		validation: {
			height: {
				min: 100,
			},
		},
	})
	.addMedia("max_height_media", {
		validation: {
			height: {
				max: 200,
			},
		},
	})
	.addMedia("type_media", {
		validation: {
			type: "image",
		},
	})
	.addMedia("extension_media", {
		validation: {
			extensions: ["png"],
		},
	});

test("successfully validate field - media", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("standard_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("required_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Min width
	const minWidthValidate = validateField({
		field: {
			key: "min_width_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("min_width_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minWidthValidate).length(0);

	// Max width
	const maxWidthValidate = validateField({
		field: {
			key: "max_width_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("max_width_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(maxWidthValidate).length(0);

	// Min height
	const minHeightValidate = validateField({
		field: {
			key: "min_height_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("min_height_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minHeightValidate).length(0);

	// Max height
	const maxHeightValidate = validateField({
		field: {
			key: "max_height_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("max_height_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(maxHeightValidate).length(0);

	// Type
	const typeValidate = validateField({
		field: {
			key: "type_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("type_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(typeValidate).length(0);

	// Extension
	const extensionValidate = validateField({
		field: {
			key: "extension_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("extension_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(extensionValidate).length(0);
});

test("fail to validate field - media", async () => {
	// Required - Media not found
	const requiredExistsValidate = validateField({
		field: {
			key: "required_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("required_media")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredExistsValidate).toEqual([
		{
			key: "required_media",
			localeCode: null,
			message: T("field_media_not_found"),
		},
	]);

	// Required - null value
	const requiredNullValidate = validateField({
		field: {
			key: "required_media",
			type: "media",
			value: null,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("required_media")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredNullValidate).toEqual([
		{
			key: "required_media",
			localeCode: null,
			message: T("generic_field_required"),
		},
	]);

	// Min width
	const minWidthValidate = validateField({
		field: {
			key: "min_width_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("min_width_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 50,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minWidthValidate).toEqual([
		{
			key: "min_width_media",
			localeCode: null,
			message: T("field_media_min_width", {
				min: 100,
			}),
		},
	]);

	// Max width
	const maxWidthValidate = validateField({
		field: {
			key: "max_width_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("max_width_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 1000,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(maxWidthValidate).toEqual([
		{
			key: "max_width_media",
			localeCode: null,
			message: T("field_media_max_width", {
				max: 200,
			}),
		},
	]);

	// Min height
	const minHeightValidate = validateField({
		field: {
			key: "min_height_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("min_height_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 50,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minHeightValidate).toEqual([
		{
			key: "min_height_media",
			localeCode: null,
			message: T("field_media_min_height", {
				min: 100,
			}),
		},
	]);

	// Max height
	const maxHeightValidate = validateField({
		field: {
			key: "max_height_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("max_height_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "png",
					width: 150,
					height: 1000,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(maxHeightValidate).toEqual([
		{
			key: "max_height_media",
			localeCode: null,
			message: T("field_media_max_height", {
				max: 200,
			}),
		},
	]);

	// Type
	const typeValidate = validateField({
		field: {
			key: "type_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("type_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "document",
					file_extension: "pdf",
					width: null,
					height: null,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(typeValidate).toEqual([
		{
			key: "type_media",
			localeCode: null,
			message: T("field_media_type", {
				type: "image",
			}),
		},
	]);

	// Extension
	const extensionValidate = validateField({
		field: {
			key: "extension_media",
			type: "media",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: MediaCollection.fields.get("extension_media")!,
		validationData: {
			media: [
				{
					id: 1,
					type: "image",
					file_extension: "jpg",
					width: 150,
					height: 150,
				},
			],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: MediaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(extensionValidate).toEqual([
		{
			key: "extension_media",
			localeCode: null,
			message: T("field_media_extension", {
				extensions: "png",
			}),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new MediaCustomField("field", {
		details: {
			label: {
				en: "title",
			},
			summary: {
				en: "description",
			},
		},
		config: {
			useTranslations: true,
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			extensions: ["png"],
			type: "image",
			width: {
				min: 10,
				max: 100,
			},
			height: {
				min: 10,
				max: 100,
			},
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

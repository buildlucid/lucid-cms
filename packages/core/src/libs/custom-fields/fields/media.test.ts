import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import MediaCustomField from "./media.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

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
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(standardValidate).toBe(null);

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(requiredValidate).toBe(null);

	// Min width
	const minWidthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_width_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(minWidthValidate).toBe(null);

	// Max width
	const maxWidthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "max_width_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(maxWidthValidate).toBe(null);

	// Min height
	const minHeightValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_height_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(minHeightValidate).toBe(null);

	// Max height
	const maxHeightValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "max_height_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(maxHeightValidate).toBe(null);

	// Type
	const typeValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "type_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(typeValidate).toBe(null);

	// Extension
	const extensionValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "extension_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(extensionValidate).toBe(null);
});

test("fail to validate field - media", async () => {
	// Required
	const requiredValidate = {
		exists: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_media",
				type: "media",
				value: 1,
				localeCode: "en",
			},
			instance: MediaCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		null: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_media",
				type: "media",
				value: null,
				localeCode: "en",
			},
			instance: MediaCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: {
			key: "required_media",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("field_media_not_found"),
		},
		null: {
			key: "required_media",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
	});

	// Min width
	const minWidthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_width_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(minWidthValidate).toEqual({
		key: "min_width_media",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_media_min_width", {
			min: 100,
		}),
	});

	// Max width
	const maxWidthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "max_width_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(maxWidthValidate).toEqual({
		key: "max_width_media",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_media_max_width", {
			max: 200,
		}),
	});

	// Min height
	const minHeightValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_height_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(minHeightValidate).toEqual({
		key: "min_height_media",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_media_min_height", {
			min: 100,
		}),
	});

	// Max height
	const maxHeightValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "max_height_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(maxHeightValidate).toEqual({
		key: "max_height_media",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_media_max_height", {
			max: 200,
		}),
	});

	// Type
	const typeValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "type_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(typeValidate).toEqual({
		key: "type_media",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_media_type", {
			type: "image",
		}),
	});

	// Extension
	const extensionValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "extension_media",
			type: "media",
			value: 1,
			localeCode: "en",
		},
		instance: MediaCollection,
		data: {
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
	});
	expect(extensionValidate).toEqual({
		key: "extension_media",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_media_extension", {
			extensions: "png",
		}),
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new MediaCustomField("field", {
		labels: {
			title: {
				en: "title",
			},
			description: {
				en: "description",
			},
		},
		translations: true,
		hidden: false,
		disabled: false,
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

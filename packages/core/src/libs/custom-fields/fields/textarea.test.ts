import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import TextareaCustomField from "./textarea.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const TextareaCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	title: "Test",
	singular: "Test",
	useTranslations: true,
})
	.addTextarea("standard_textarea")
	.addTextarea("required_textarea", {
		validation: {
			required: true,
		},
	})
	.addTextarea("min_length_textarea", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - textarea", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_textarea",
			type: "textarea",
			value: "Standard textarea",
			localeCode: "en",
		},
		instance: TextareaCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toBe(null);

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_textarea",
			type: "textarea",
			value: "Required textarea",
			localeCode: "en",
		},
		instance: TextareaCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);

	// Min length
	const minLengthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_length_textarea",
			type: "textarea",
			value: "Min length textarea",
			localeCode: "en",
		},
		instance: TextareaCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(minLengthValidate).toBe(null);
});

test("fail to validate field - textarea", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_textarea",
			type: "textarea",
			value: 100,
			localeCode: "en",
		},
		instance: TextareaCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_textarea",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Expected string, received number", // zod error message
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_textarea",
			type: "textarea",
			value: undefined,
			localeCode: "en",
		},
		instance: TextareaCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_textarea",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("generic_field_required"),
	});

	// Min length
	const minLengthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_length_textarea",
			type: "textarea",
			value: "1",
			localeCode: "en",
		},
		instance: TextareaCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(minLengthValidate).toEqual({
		key: "min_length_textarea",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "String must contain at least 5 character(s)", // zod error message
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TextareaCustomField("field", {
		labels: {
			title: {
				en: "title",
			},
			description: {
				en: "description",
			},
			placeholder: {
				en: "placeholder",
			},
		},
		translations: true,
		default: "",
		hidden: false,
		disabled: false,
		validation: {
			required: true,
			zod: z.string().min(5),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

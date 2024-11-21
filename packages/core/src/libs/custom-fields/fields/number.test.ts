import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import NumberCustomField from "./number.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const NumberCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	title: "Test",
	singular: "Test",
	useTranslations: true,
})
	.addNumber("standard_number")
	.addNumber("required_number", {
		validation: {
			required: true,
		},
	})
	.addNumber("min_number", {
		validation: {
			zod: z.number().min(5),
		},
	});

test("successfully validate field - number", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_number",
			type: "number",
			value: 1,
			localeCode: "en",
		},
		instance: NumberCollection,
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
			key: "required_number",
			type: "number",
			value: 1,
			localeCode: "en",
		},
		instance: NumberCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);

	// Zod
	const zodValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_number",
			type: "number",
			value: 5,
			localeCode: "en",
		},
		instance: NumberCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(zodValidate).toBe(null);
});

test("fail to validate field - number", async () => {
	// Standard;
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_number",
			type: "number",
			value: "1",
			localeCode: "en",
		},
		instance: NumberCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_number",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Expected number, received string", // zod error message
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_number",
			type: "number",
			value: undefined,
			localeCode: "en",
		},
		instance: NumberCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_number",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("generic_field_required"),
	});

	// Zod
	const zodValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_number",
			type: "number",
			value: 1,
			localeCode: "en",
		},
		instance: NumberCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(zodValidate).toEqual({
		key: "min_number",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Number must be greater than or equal to 5", // zod error message
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new NumberCustomField("field", {
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
		default: 10,
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

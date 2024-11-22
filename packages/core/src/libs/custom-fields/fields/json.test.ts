import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import JsonCustomField from "./json.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const JSONCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addJSON("standard_json")
	.addJSON("required_json", {
		validation: {
			required: true,
		},
	})
	.addJSON("zod_json", {
		validation: {
			zod: z.object({
				key: z.string(),
				value: z.string(),
			}),
		},
	});

test("successfully validate field - json", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_json",
			type: "json",
			value: {
				key: "value",
			},
			localeCode: "en",
		},
		instance: JSONCollection,
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
			key: "required_json",
			type: "json",
			value: {
				key: "value",
			},
			localeCode: "en",
		},
		instance: JSONCollection,
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
			key: "zod_json",
			type: "json",
			value: {
				key: "value",
				value: "value",
			},
			localeCode: "en",
		},
		instance: JSONCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(zodValidate).toBe(null);
});

test("fail to validate field - json", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_json",
			type: "json",
			value: "invalid json",
			localeCode: "en",
		},
		instance: JSONCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_json",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Expected object, received string", // zod error message
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_json",
			type: "json",
			value: undefined,
			localeCode: "en",
		},
		instance: JSONCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_json",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("generic_field_required"),
	});

	// Zod
	const zodValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "zod_json",
			type: "json",
			value: {
				key: "value",
				value: true, // not a string
			},
			localeCode: "en",
		},
		instance: JSONCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(zodValidate).toEqual({
		key: "zod_json",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: 'Expected string, received boolean at "value"', // zod error message
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new JsonCustomField("field", {
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
		default: {
			hello: "world",
		},
		hidden: false,
		disabled: false,
		validation: {
			required: true,
			zod: z.object({
				hello: z.string(),
			}),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

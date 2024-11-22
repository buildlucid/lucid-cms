import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import TextCutomField from "./text.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const TextCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addText("standard_text")
	.addText("required_text", {
		validation: {
			required: true,
		},
	})
	.addText("min_length_text", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - text", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_text",
			type: "text",
			value: "Standard text",
			localeCode: "en",
		},
		instance: TextCollection,
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
			key: "required_text",
			type: "text",
			value: "Required text",
			localeCode: "en",
		},
		instance: TextCollection,
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
			key: "min_length_text",
			type: "text",
			value: "Min length text",
			localeCode: "en",
		},
		instance: TextCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(minLengthValidate).toBe(null);
});

test("fail to validate field - text", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_text",
			type: "text",
			value: 100,
			localeCode: "en",
		},
		instance: TextCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_text",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Expected string, received number", // zod error message
	});

	// Required
	const requiredValidate = {
		undefined: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_text",
				type: "text",
				value: undefined,
				localeCode: "en",
			},
			instance: TextCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		null: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_text",
				type: "text",
				value: null,
				localeCode: "en",
			},
			instance: TextCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		empty: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_text",
				type: "text",
				value: "",
				localeCode: "en",
			},
			instance: TextCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(requiredValidate).toEqual({
		undefined: {
			key: "required_text",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
		null: {
			key: "required_text",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
		empty: {
			key: "required_text",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
	});

	// Min length
	const minLengthValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "min_length_text",
			type: "text",
			value: "1",
			localeCode: "en",
		},
		instance: TextCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(minLengthValidate).toEqual({
		key: "min_length_text",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "String must contain at least 5 character(s)", // zod error message
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TextCutomField("field", {
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
		useTranslations: true,
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

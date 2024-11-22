import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import WysiwygCustomField from "./wysiwyg.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const WysiwygCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addWysiwyg("standard_wysiwyg")
	.addWysiwyg("required_wysiwyg", {
		validation: {
			required: true,
		},
	})
	.addWysiwyg("min_length_wysiwyg", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - wysiwyg", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
			localeCode: "en",
		},
		instance: WysiwygCollection,
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
			key: "required_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
			localeCode: "en",
		},
		instance: WysiwygCollection,
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
			key: "min_length_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
			localeCode: "en",
		},
		instance: WysiwygCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(minLengthValidate).toBe(null);
});

test("fail to validate field - wysiwyg", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_wysiwyg",
			type: "wysiwyg",
			value: 100,
			localeCode: "en",
		},
		instance: WysiwygCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_wysiwyg",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Expected string, received number", // zod error message
	});

	// Required
	const requiredValidate = {
		exists: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_wysiwyg",
				type: "wysiwyg",
				value: undefined,
				localeCode: "en",
			},
			instance: WysiwygCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		null: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_wysiwyg",
				type: "wysiwyg",
				value: null,
				localeCode: "en",
			},
			instance: WysiwygCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: {
			key: "required_wysiwyg",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
		null: {
			key: "required_wysiwyg",
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
			key: "min_length_wysiwyg",
			type: "wysiwyg",
			value: "Hi",
			localeCode: "en",
		},
		instance: WysiwygCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(minLengthValidate).toEqual({
		key: "min_length_wysiwyg",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "String must contain at least 5 character(s)", // zod error message
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new WysiwygCustomField("field", {
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

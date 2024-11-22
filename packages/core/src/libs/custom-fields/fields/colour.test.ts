import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import ColourCustomField from "./colour.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const ColourCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addColour("standard_colour")
	.addColour("required_colour", {
		validation: {
			required: true,
		},
	});

test("successfully validate field - colour", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_colour",
			type: "colour",
			value: "#000000",
			localeCode: "en",
		},
		instance: ColourCollection,
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
			key: "required_colour",
			type: "colour",
			value: "#000000",
			localeCode: "en",
		},
		instance: ColourCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);
});

test("fail to validate field - colour", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_colour",
			type: "colour",
			value: 0,
			localeCode: "en",
		},
		instance: ColourCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_colour",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: "Expected string, received number", // zod error message
	});

	// Required
	const requiredValidate = {
		empty: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_colour",
				type: "colour",
				value: "",
				localeCode: "en",
			},
			instance: ColourCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		null: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_colour",
				type: "colour",
				value: null,
				localeCode: "en",
			},
			instance: ColourCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		undefined: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_colour",
				type: "colour",
				value: undefined,
				localeCode: "en",
			},
			instance: ColourCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(requiredValidate).toEqual({
		empty: {
			key: "required_colour",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
		null: {
			key: "required_colour",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
		undefined: {
			key: "required_colour",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new ColourCustomField("field", {
		labels: {
			title: {
				en: "title",
			},
			description: {
				en: "description",
			},
		},
		translations: true,
		default: "2024-06-15T14:14:21.704Z",
		hidden: false,
		disabled: false,
		validation: {
			required: true,
		},
		presets: ["#000000"],
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

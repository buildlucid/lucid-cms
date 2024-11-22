import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import CheckboxCustomField from "./checkbox.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const CheckboxCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
	},
	config: {
		useTranslations: true,
	},
})
	.addCheckbox("standard_checkbox")
	.addCheckbox("required_chekbox", {
		validation: {
			required: true,
		},
	});

test("successfully validate field - checkbox", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_checkbox",
			type: "checkbox",
			value: 0,
			localeCode: "en",
		},
		instance: CheckboxCollection,
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
			key: "required_chekbox",
			type: "checkbox",
			value: 1,
			localeCode: "en",
		},
		instance: CheckboxCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);
});

test("fail to validate field - checkbox", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_checkbox",
			type: "checkbox",
			value: "1",
			localeCode: "en",
		},
		instance: CheckboxCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toEqual({
		key: "standard_checkbox",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message:
			"Invalid literal value, expected 1, or Invalid literal value, expected 0, or Expected boolean, received string", // zod error message
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_chekbox",
			type: "checkbox",
			value: 0,
			localeCode: "en",
		},
		instance: CheckboxCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_chekbox",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("checkbox_field_required"),
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new CheckboxCustomField("field", {
		labels: {
			title: {
				en: "title",
			},
			description: {
				en: "description",
			},
		},
		translations: true,
		default: 1,
		hidden: false,
		disabled: false,
		validation: {
			required: true,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

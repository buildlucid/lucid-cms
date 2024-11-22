import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import SelectCustomField from "./select.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
	selectOptions: [
		{
			label: "Option 1",
			value: "option-1",
		},
		{
			label: "Option 2",
			value: "option-2",
		},
		{
			label: "Option 3",
			value: "option-3",
		},
	],
};

// -----------------------------------------------
// Validation
const SelectCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addSelect("standard_select", {
		options: CONSTANTS.selectOptions,
	})
	.addSelect("required_select", {
		options: CONSTANTS.selectOptions,
		validation: {
			required: true,
		},
	});

test("successfully validate field - select", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_select",
			type: "select",
			value: "option-1",
			localeCode: "en",
		},
		instance: SelectCollection,
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
			key: "required_select",
			type: "select",
			value: "option-1",
			localeCode: "en",
		},
		instance: SelectCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);
});
test("fail to validate field - select", async () => {
	// Standard
	const standardValidate = {
		exists: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_select",
				type: "select",
				value: "option-10",
				localeCode: "en",
			},
			instance: SelectCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		number: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_select",
				type: "select",
				value: 1,
				localeCode: "en",
			},
			instance: SelectCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(standardValidate).toEqual({
		exists: {
			key: "standard_select",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("please_ensure_a_valid_option_is_selected"),
		},
		number: {
			key: "standard_select",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: "Expected string, received number", // zod error message
		},
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_select",
			type: "select",
			value: undefined,
			localeCode: "en",
		},
		instance: SelectCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_select",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("select_field_required"),
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new SelectCustomField("field", {
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
		options: CONSTANTS.selectOptions,
		validation: {
			required: true,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import CheckboxCustomField from "./checkbox.js";

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
		field: {
			key: "standard_checkbox",
			type: "checkbox",
			value: 0,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: CheckboxCollection.fields.get("standard_checkbox")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: CheckboxCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_chekbox",
			type: "checkbox",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: CheckboxCollection.fields.get("required_chekbox")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: CheckboxCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - checkbox", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_checkbox",
			type: "checkbox",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: CheckboxCollection.fields.get("standard_checkbox")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: CheckboxCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_checkbox",
			localeCode: null,
			message: "Invalid input",
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_chekbox",
			type: "checkbox",
			value: 0,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: CheckboxCollection.fields.get("required_chekbox")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: CheckboxCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_chekbox",
			localeCode: null,
			message: T("checkbox_field_required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new CheckboxCustomField("field", {
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
			default: true,
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
		},
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

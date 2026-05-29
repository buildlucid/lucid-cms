import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { text } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import CheckboxCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const CheckboxCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: text.admin("tests.collections.collection.name", {
			defaultMessage: "Pages",
		}),
		singularName: text.admin("tests.collections.collection.singularName", {
			defaultMessage: "Page",
		}),
	},
	config: {
		localized: true,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CheckboxCollection.fields.get("standard_checkbox")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: CheckboxCollection.getData.config.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CheckboxCollection.fields.get("required_chekbox")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: CheckboxCollection.getData.config.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CheckboxCollection.fields.get("standard_checkbox")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: CheckboxCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_checkbox",
			localeCode: null,
			message: text.server("core.fields.validation.errors.unknown", {
				defaultMessage: "Invalid input",
			}),
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_chekbox",
			type: "checkbox",
			value: 0,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CheckboxCollection.fields.get("required_chekbox")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: CheckboxCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_chekbox",
			localeCode: null,
			message: text.server("core.fields.checkbox.validation.required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new CheckboxCustomField("field", {
		details: {
			label: text.admin("tests.fields.field.label", {
				defaultMessage: "title",
			}),
			summary: text.admin("tests.fields.field.summary", {
				defaultMessage: "description",
			}),
		},
		config: {
			localized: true,
			default: true,
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
		},
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

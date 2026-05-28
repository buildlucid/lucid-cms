import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { adminText, serverText } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import CheckboxCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const CheckboxCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: adminText("tests.collections.collection.name", { fallback: "Pages" }),
		singularName: adminText("tests.collections.collection.singularName", {
			fallback: "Page",
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
			message: serverText("core.fields.validation.errors.unknown", {
				fallback: "Invalid input",
				priority: "Invalid input",
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
			message: serverText("core.fields.checkbox.validation.required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new CheckboxCustomField("field", {
		details: {
			label: adminText("tests.fields.field.label", {
				fallback: "title",
			}),
			summary: adminText("tests.fields.field.summary", {
				fallback: "description",
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

import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { adminText, serverText } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import SelectCustomField from "./custom-field.js";

const CONSTANTS = {
	selectOptions: [
		{
			label: adminText("core.tests.fields.select.options.option.1", {
				fallback: "Option 1",
			}),
			value: "option-1",
		},
		{
			label: adminText("core.tests.fields.select.options.option.2", {
				fallback: "Option 2",
			}),
			value: "option-2",
		},
		{
			label: adminText("core.tests.fields.select.options.option.3", {
				fallback: "Option 3",
			}),
			value: "option-3",
		},
	],
};

// -----------------------------------------------
// Validation
const SelectCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: adminText("tests.collections.collection.name", { fallback: "Test" }),
		singularName: adminText("tests.collections.collection.singularName", {
			fallback: "Test",
		}),
	},
	config: {
		localized: true,
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
		field: {
			key: "standard_select",
			type: "select",
			value: "option-1",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: SelectCollection.fields.get("standard_select")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: SelectCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Optional with empty value
	const optionalEmptyValidate = validateField({
		field: {
			key: "standard_select",
			type: "select",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: SelectCollection.fields.get("standard_select")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: SelectCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(optionalEmptyValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_select",
			type: "select",
			value: "option-1",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: SelectCollection.fields.get("required_select")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: SelectCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - select", async () => {
	// Standard
	const standardValidate = {
		exists: validateField({
			field: {
				key: "standard_select",
				type: "select",
				value: "option-10",
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: SelectCollection.fields.get("standard_select")!,
			validationData: {
				media: [],
				user: [],
				document: [],
			},
			meta: {
				localized: SelectCollection.getData.config.localized,
				defaultLocale: "en",
			},
		}),
		number: validateField({
			field: {
				key: "standard_select",
				type: "select",
				value: 1,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: SelectCollection.fields.get("standard_select")!,
			validationData: {
				media: [],
				user: [],
				document: [],
			},
			meta: {
				localized: SelectCollection.getData.config.localized,
				defaultLocale: "en",
			},
		}),
	};
	expect(standardValidate).toEqual({
		exists: [
			{
				key: "standard_select",
				localeCode: null,
				message: serverText("core.fields.select.validation.option.invalid"),
			},
		],
		number: [
			{
				key: "standard_select",
				localeCode: null,
				message: serverText("core.fields.validation.errors.unknown", {
					fallback: "Invalid input: expected string, received number",
					priority: "Invalid input: expected string, received number",
				}),
			},
		],
	});

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_select",
			type: "select",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: SelectCollection.fields.get("required_select")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: SelectCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_select",
			localeCode: null,
			message: serverText("core.fields.select.validation.required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new SelectCustomField("field", {
		details: {
			label: adminText("tests.fields.field.label", {
				fallback: "title",
			}),
			summary: adminText("tests.fields.field.summary", {
				fallback: "description",
			}),
			placeholder: adminText("tests.fields.field.placeholder", {
				fallback: "placeholder",
			}),
		},
		config: {
			localized: true,
			default: "",
			hidden: false,
			disabled: false,
		},
		options: CONSTANTS.selectOptions,
		validation: {
			required: true,
		},
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

import { expect, test } from "vitest";
import z from "zod";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { adminText, serverText } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import TextareaCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const TextareaCollection = new CollectionBuilder("collection", {
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
	.addTextarea("standard_textarea")
	.addTextarea("required_textarea", {
		validation: {
			required: true,
		},
	})
	.addTextarea("min_length_textarea", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - textarea", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_textarea",
			type: "textarea",
			value: "Standard textarea",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextareaCollection.fields.get("standard_textarea")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: TextareaCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_textarea",
			type: "textarea",
			value: "Required textarea",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextareaCollection.fields.get("required_textarea")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: TextareaCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_textarea",
			type: "textarea",
			value: "Min length textarea",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextareaCollection.fields.get("min_length_textarea")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: TextareaCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).length(0);
});

test("fail to validate field - textarea", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_textarea",
			type: "textarea",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextareaCollection.fields.get("standard_textarea")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: TextareaCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_textarea",
			localeCode: "en",
			message: serverText("core.fields.validation.errors.unknown", {
				fallback: "Invalid input: expected string, received number",
				priority: "Invalid input: expected string, received number",
			}),
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_textarea",
			type: "textarea",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextareaCollection.fields.get("required_textarea")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: TextareaCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_textarea",
			localeCode: "en",
			message: serverText("core.fields.validation.required"),
		},
	]);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_textarea",
			type: "textarea",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextareaCollection.fields.get("min_length_textarea")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: TextareaCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_textarea",
			localeCode: "en",
			message: serverText("core.fields.validation.errors.unknown", {
				fallback: "Too small: expected string to have >=5 characters",
				priority: "Too small: expected string to have >=5 characters",
			}),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TextareaCustomField("field", {
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
		validation: {
			required: true,
			zod: z.string().min(5),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

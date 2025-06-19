import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod/v4";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import TextareaCustomField from "./textarea.js";

// -----------------------------------------------
// Validation
const TextareaCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
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
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextareaCollection.fields.get("standard_textarea")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextareaCollection.getData.config.useTranslations,
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
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextareaCollection.fields.get("required_textarea")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextareaCollection.getData.config.useTranslations,
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
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextareaCollection.fields.get("min_length_textarea")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextareaCollection.getData.config.useTranslations,
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
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextareaCollection.fields.get("standard_textarea")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextareaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_textarea",
			localeCode: "en",
			message: "Invalid input: expected string, received number", // zod error message
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_textarea",
			type: "textarea",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextareaCollection.fields.get("required_textarea")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextareaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_textarea",
			localeCode: "en",
			message: T("generic_field_required"),
		},
	]);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_textarea",
			type: "textarea",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextareaCollection.fields.get("min_length_textarea")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextareaCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_textarea",
			localeCode: "en",
			message: "Too small: expected string to have >=5 characters", // zod error message
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TextareaCustomField("field", {
		details: {
			label: {
				en: "title",
			},
			summary: {
				en: "description",
			},
			placeholder: {
				en: "placeholder",
			},
		},
		config: {
			useTranslations: true,
			default: "",
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			zod: z.string().min(5),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

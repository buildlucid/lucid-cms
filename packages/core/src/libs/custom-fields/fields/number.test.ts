import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod/v4";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import NumberCustomField from "./number.js";

// -----------------------------------------------
// Validation
const NumberCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addNumber("standard_number")
	.addNumber("required_number", {
		validation: {
			required: true,
		},
	})
	.addNumber("min_number", {
		validation: {
			zod: z.number().min(5),
		},
	});

test("successfully validate field - number", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NumberCollection.fields.get("standard_number")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: NumberCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NumberCollection.fields.get("required_number")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: NumberCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Zod
	const zodValidate = validateField({
		field: {
			key: "min_number",
			type: "number",
			value: 5,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NumberCollection.fields.get("min_number")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: NumberCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(zodValidate).length(0);
});

test("fail to validate field - number", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_number",
			type: "number",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NumberCollection.fields.get("standard_number")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: NumberCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_number",
			localeCode: null,
			message: "Invalid input: expected number, received string", // zod error message
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_number",
			type: "number",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NumberCollection.fields.get("required_number")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: NumberCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_number",
			localeCode: null,
			message: T("generic_field_required"),
		},
	]);

	// Zod
	const zodValidate = validateField({
		field: {
			key: "min_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NumberCollection.fields.get("min_number")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: NumberCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(zodValidate).toEqual([
		{
			key: "min_number",
			localeCode: null,
			message: "Too small: expected number to be >=5",
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new NumberCustomField("field", {
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
			default: 10,
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

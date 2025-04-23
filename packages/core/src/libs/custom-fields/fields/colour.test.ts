import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import ColourCustomField from "./colour.js";

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
		field: {
			key: "standard_colour",
			type: "colour",
			value: "#000000",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: ColourCollection.fields.get("standard_colour")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: ColourCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_colour",
			type: "colour",
			value: "#000000",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: ColourCollection.fields.get("required_colour")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: ColourCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);
});

test("fail to validate field - colour", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_colour",
			type: "colour",
			value: 0,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: ColourCollection.fields.get("standard_colour")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: ColourCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_colour",
			localeCode: null,
			message: "Invalid input: expected string, received number", // zod error message
		},
	]);

	// Required - empty value
	const requiredEmptyValidate = validateField({
		field: {
			key: "required_colour",
			type: "colour",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: ColourCollection.fields.get("required_colour")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: ColourCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredEmptyValidate).toEqual([
		{
			key: "required_colour",
			message: T("generic_field_required"),
		},
	]);

	// Required - null value
	const requiredNullValidate = validateField({
		field: {
			key: "required_colour",
			type: "colour",
			value: null,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: ColourCollection.fields.get("required_colour")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: ColourCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredNullValidate).toEqual([
		{
			key: "required_colour",
			message: T("generic_field_required"),
		},
	]);

	// Required - undefined value
	const requiredUndefinedValidate = validateField({
		field: {
			key: "required_colour",
			type: "colour",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: ColourCollection.fields.get("required_colour")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: ColourCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredUndefinedValidate).toEqual([
		{
			key: "required_colour",
			message: T("generic_field_required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new ColourCustomField("field", {
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
			default: "2024-06-15T14:14:21.704Z",
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
		},
		presets: ["#000000"],
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

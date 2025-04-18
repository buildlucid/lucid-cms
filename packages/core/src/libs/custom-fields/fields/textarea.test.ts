import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
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
	const standardValidate = validateField(
		{
			key: "standard_textarea",
			type: "textarea",
			value: "Standard textarea",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		TextareaCollection.fields.get("standard_textarea")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField(
		{
			key: "required_textarea",
			type: "textarea",
			value: "Required textarea",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		TextareaCollection.fields.get("required_textarea")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField(
		{
			key: "min_length_textarea",
			type: "textarea",
			value: "Min length textarea",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		TextareaCollection.fields.get("min_length_textarea")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(minLengthValidate).length(0);
});

test("fail to validate field - textarea", async () => {
	// Standard
	const standardValidate = validateField(
		{
			key: "standard_textarea",
			type: "textarea",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		TextareaCollection.fields.get("standard_textarea")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardValidate).toEqual([
		{
			key: "standard_textarea",
			message: "Expected string, received number", // zod error message
		},
	]);

	// Required
	const requiredValidate = validateField(
		{
			key: "required_textarea",
			type: "textarea",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		TextareaCollection.fields.get("required_textarea")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).toEqual([
		{
			key: "required_textarea",
			message: T("generic_field_required"),
		},
	]);

	// Min length
	const minLengthValidate = validateField(
		{
			key: "min_length_textarea",
			type: "textarea",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		TextareaCollection.fields.get("min_length_textarea")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_textarea",
			message: "String must contain at least 5 character(s)", // zod error message
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

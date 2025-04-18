import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
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
	const standardValidate = validateField(
		{
			key: "standard_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		NumberCollection.fields.get("standard_number")!,
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
			key: "required_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		NumberCollection.fields.get("required_number")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).length(0);

	// Zod
	const zodValidate = validateField(
		{
			key: "min_number",
			type: "number",
			value: 5,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		NumberCollection.fields.get("min_number")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(zodValidate).length(0);
});

test("fail to validate field - number", async () => {
	// Standard
	const standardValidate = validateField(
		{
			key: "standard_number",
			type: "number",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		NumberCollection.fields.get("standard_number")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardValidate).toEqual([
		{
			key: "standard_number",
			message: "Expected number, received string", // zod error message
		},
	]);

	// Required
	const requiredValidate = validateField(
		{
			key: "required_number",
			type: "number",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		NumberCollection.fields.get("required_number")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).toEqual([
		{
			key: "required_number",
			message: T("generic_field_required"),
		},
	]);

	// Zod
	const zodValidate = validateField(
		{
			key: "min_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		NumberCollection.fields.get("min_number")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(zodValidate).toEqual([
		{
			key: "min_number",
			message: "Number must be greater than or equal to 5", // zod error message
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

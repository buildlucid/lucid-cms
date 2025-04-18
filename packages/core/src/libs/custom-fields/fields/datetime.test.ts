import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import DatetimeCustomField from "./datetime.js";

// -----------------------------------------------
// Validation
const DateTimeCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addDateTime("standard_datetime")
	.addDateTime("required_datetime", {
		validation: {
			required: true,
		},
	});

test("successfully validate field - datetime", async () => {
	// Standard with string value
	const standardStringValidate = validateField(
		{
			key: "standard_datetime",
			type: "datetime",
			value: "2024-06-15T14:14:21.704Z",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("standard_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardStringValidate).length(0);

	// Standard with number value
	const standardNumberValidate = validateField(
		{
			key: "standard_datetime",
			type: "datetime",
			value: 1676103221704,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("standard_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardNumberValidate).length(0);

	// Standard with date value
	const standardDateValidate = validateField(
		{
			key: "standard_datetime",
			type: "datetime",
			value: new Date("2024-06-15T14:14:21.704Z"),
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("standard_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardDateValidate).length(0);

	// Required
	const requiredValidate = validateField(
		{
			key: "required_datetime",
			type: "datetime",
			value: "2024-06-15T14:14:21.704Z",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("required_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).length(0);
});

test("fail to validate field - datetime", async () => {
	// Standard with boolean value
	const standardBooleanValidate = validateField(
		{
			key: "standard_datetime",
			type: "datetime",
			value: true,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("standard_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardBooleanValidate).toEqual([
		{
			key: "standard_datetime",
			message:
				"Expected string, received boolean, or Expected number, received boolean, or Expected date, received boolean",
		},
	]);

	// Standard with invalid string
	const standardInvalidStringValidate = validateField(
		{
			key: "standard_datetime",
			type: "datetime",
			value: "string",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("standard_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardInvalidStringValidate).toEqual([
		{
			key: "standard_datetime",
			message: T("field_date_invalid"),
		},
	]);

	// Standard with invalid date format
	const standardInvalidDateValidate = validateField(
		{
			key: "standard_datetime",
			type: "datetime",
			value: "20024-06-15T14:14:21.704",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("standard_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardInvalidDateValidate).toEqual([
		{
			key: "standard_datetime",
			message: T("field_date_invalid"),
		},
	]);

	// Required with empty value
	const requiredValidate = validateField(
		{
			key: "required_datetime",
			type: "datetime",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DateTimeCollection.fields.get("required_datetime")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).toEqual([
		{
			key: "required_datetime",
			message: T("generic_field_required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new DatetimeCustomField("field", {
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
			default: "2024-06-15T14:14:21.704Z",
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			zod: z.date().min(new Date("2024-06-15T14:14:21.704Z")),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

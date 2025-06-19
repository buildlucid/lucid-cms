import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod/v4";
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
	const standardStringValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: "2024-06-15T14:14:21.704Z",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardStringValidate).length(0);

	// Standard with number value
	const standardNumberValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: 1676103221704,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardNumberValidate).length(0);

	// Standard with date value
	const standardDateValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: new Date("2024-06-15T14:14:21.704Z"),
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardDateValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_datetime",
			type: "datetime",
			value: "2024-06-15T14:14:21.704Z",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("required_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - datetime", async () => {
	// Standard with boolean value
	const standardBooleanValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: true,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardBooleanValidate).toEqual([
		{
			key: "standard_datetime",
			localeCode: null,
			message: "Invalid input",
		},
	]);

	// Standard with invalid string
	const standardInvalidStringValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: "string",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardInvalidStringValidate).toEqual([
		{
			key: "standard_datetime",
			localeCode: null,
			message: T("field_date_invalid"),
		},
	]);

	// Standard with invalid date format
	const standardInvalidDateValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: "20024-06-15T14:14:21.704",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardInvalidDateValidate).toEqual([
		{
			key: "standard_datetime",
			localeCode: null,
			message: T("field_date_invalid"),
		},
	]);

	// Required with empty value
	const requiredValidate = validateField({
		field: {
			key: "required_datetime",
			type: "datetime",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: DateTimeCollection.fields.get("required_datetime")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: DateTimeCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_datetime",
			localeCode: null,
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

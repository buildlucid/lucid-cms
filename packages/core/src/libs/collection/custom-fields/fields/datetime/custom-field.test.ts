import { expect, test } from "vitest";
import z from "zod";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import type DatabaseAdapter from "../../../../db/adapter-base.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import DatetimeCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const DateTimeCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: copy("admin:tests.collections.collection.name", {
			defaultMessage: "Test",
		}),
		singularName: copy("admin:tests.collections.collection.singularName", {
			defaultMessage: "Test",
		}),
	},
	localized: true,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardDateValidate).length(0);

	// Optional with empty value
	const optionalEmptyValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(optionalEmptyValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_datetime",
			type: "datetime",
			value: "2024-06-15T14:14:21.704Z",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("required_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardBooleanValidate).toEqual([
		{
			key: "standard_datetime",
			localeCode: null,
			message: copy.literal("Invalid input"),
		},
	]);

	// Standard with invalid string
	const standardInvalidStringValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: "string",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardInvalidStringValidate).toEqual([
		{
			key: "standard_datetime",
			localeCode: null,
			message: copy("server:core.fields.date.validation.invalid"),
		},
	]);

	// Standard with invalid date format
	const standardInvalidDateValidate = validateField({
		field: {
			key: "standard_datetime",
			type: "datetime",
			value: "20024-06-15T14:14:21.704",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("standard_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardInvalidDateValidate).toEqual([
		{
			key: "standard_datetime",
			localeCode: null,
			message: copy("server:core.fields.date.validation.invalid"),
		},
	]);

	// Required with empty value
	const requiredValidate = validateField({
		field: {
			key: "required_datetime",
			type: "datetime",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DateTimeCollection.fields.get("required_datetime")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DateTimeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_datetime",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new DatetimeCustomField("field", {
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "title",
			}),
			summary: copy("admin:tests.fields.field.summary", {
				defaultMessage: "description",
			}),
			placeholder: copy("admin:tests.fields.field.placeholder", {
				defaultMessage: "placeholder",
			}),
		},
		localized: true,
		time: false,
		default: "2024-06-15T14:14:21.704Z",
		ui: {
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
			zod: z.date().min(new Date("2024-06-15T14:14:21.704Z")),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

test("datetime config defaults to date-only mode", () => {
	const field = new DatetimeCustomField("field");
	expect(field.config.time).toBe(false);
});

test("datetime schema omits an empty default", () => {
	// @ts-expect-error
	const db = {
		getDataType: () => "timestamp",
	} as DatabaseAdapter;
	const field = new DatetimeCustomField("field");

	const res = field.getSchemaDefinition({
		db,
		tables: {
			document: "lucid_document__test",
			version: "lucid_document__test__ver",
		},
	});

	expect(res.error).toBeUndefined();
	expect(res.data?.columns[0]?.default).toBeUndefined();
});

test("datetime schema preserves an explicitly configured default", () => {
	// @ts-expect-error
	const db = {
		getDataType: () => "timestamp",
	} as DatabaseAdapter;
	const field = new DatetimeCustomField("field", {
		default: "2024-06-15T14:14:21.704Z",
	});

	const res = field.getSchemaDefinition({
		db,
		tables: {
			document: "lucid_document__test",
			version: "lucid_document__test__ver",
		},
	});

	expect(res.error).toBeUndefined();
	expect(res.data?.columns[0]?.default).toBe("2024-06-15T14:14:21.704Z");
});

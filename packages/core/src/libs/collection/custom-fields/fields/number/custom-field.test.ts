import { expect, test } from "vitest";
import z from "zod";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import NumberCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const NumberCollection = new CollectionBuilder("collection", {
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NumberCollection.fields.get("standard_number")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: NumberCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NumberCollection.fields.get("required_number")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: NumberCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NumberCollection.fields.get("min_number")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: NumberCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NumberCollection.fields.get("standard_number")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: NumberCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_number",
			localeCode: null,
			message: copy.literal("Invalid input: expected number, received string"),
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_number",
			type: "number",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NumberCollection.fields.get("required_number")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: NumberCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_number",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);

	// Zod
	const zodValidate = validateField({
		field: {
			key: "min_number",
			type: "number",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NumberCollection.fields.get("min_number")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: NumberCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(zodValidate).toEqual([
		{
			key: "min_number",
			localeCode: null,
			message: copy.literal("Too small: expected number to be >=5"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new NumberCustomField("field", {
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
		default: 10,
		ui: {
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

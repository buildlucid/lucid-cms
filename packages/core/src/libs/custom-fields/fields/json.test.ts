import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod/v4";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import JsonCustomField from "./json.js";

// -----------------------------------------------
// Validation
const JSONCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addJSON("standard_json")
	.addJSON("required_json", {
		validation: {
			required: true,
		},
	})
	.addJSON("zod_json", {
		validation: {
			zod: z.object({
				key: z.string(),
				value: z.string(),
			}),
		},
	});

test("successfully validate field - json", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_json",
			type: "json",
			value: {
				key: "value",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: JSONCollection.fields.get("standard_json")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: JSONCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_json",
			type: "json",
			value: {
				key: "value",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: JSONCollection.fields.get("required_json")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: JSONCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Zod
	const zodValidate = validateField({
		field: {
			key: "zod_json",
			type: "json",
			value: {
				key: "value",
				value: "value",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: JSONCollection.fields.get("zod_json")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: JSONCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(zodValidate).length(0);
});

test("fail to validate field - json", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_json",
			type: "json",
			value: "invalid json",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: JSONCollection.fields.get("standard_json")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: JSONCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_json",
			localeCode: null,
			message: "Invalid input: expected record, received string",
		},
	]);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_json",
			type: "json",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: JSONCollection.fields.get("required_json")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: JSONCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_json",
			localeCode: null,
			message: T("generic_field_required"),
		},
	]);

	// Zod
	const zodValidate = validateField({
		field: {
			key: "zod_json",
			type: "json",
			value: {
				key: "value",
				value: true, // not a string
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: JSONCollection.fields.get("zod_json")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: JSONCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(zodValidate).toEqual([
		{
			key: "zod_json",
			localeCode: null,
			message: "Invalid input: expected string, received boolean → at value",
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new JsonCustomField("field", {
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
			default: {
				hello: "world",
			},
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			zod: z.object({
				hello: z.string(),
			}),
		},
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

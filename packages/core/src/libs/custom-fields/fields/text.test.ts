import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod/v4";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import TextCutomField from "./text.js";

// -----------------------------------------------
// Validation
const TextCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addText("standard_text")
	.addText("required_text", {
		validation: {
			required: true,
		},
	})
	.addText("min_length_text", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_text",
			type: "text",
			value: "Standard text",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextCollection.fields.get("standard_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_text",
			type: "text",
			value: "Required text",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextCollection.fields.get("required_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_text",
			type: "text",
			value: "Min length text",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextCollection.fields.get("min_length_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).length(0);
});

test("fail to validate field - text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_text",
			type: "text",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextCollection.fields.get("standard_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_text",
			localeCode: "en",
			message: "Invalid input: expected string, received number", // zod error message
		},
	]);

	// Required
	const requiredValidate = {
		undefined: validateField({
			field: {
				key: "required_text",
				type: "text",
				value: undefined,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: TextCollection.fields.get("required_text")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: TextCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
		null: validateField({
			field: {
				key: "required_text",
				type: "text",
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: TextCollection.fields.get("required_text")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: TextCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
		empty: validateField({
			field: {
				key: "required_text",
				type: "text",
				value: "",
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: TextCollection.fields.get("required_text")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: TextCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
	};
	expect(requiredValidate).toEqual({
		undefined: [
			{
				key: "required_text",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
		null: [
			{
				key: "required_text",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
		empty: [
			{
				key: "required_text",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
	});

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_text",
			type: "text",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TextCollection.fields.get("min_length_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: TextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_text",
			localeCode: "en",
			message: "Too small: expected string to have >=5 characters", // zod error message
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TextCutomField("field", {
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

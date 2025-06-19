import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod/v4";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import WysiwygCustomField from "./wysiwyg.js";

// -----------------------------------------------
// Validation
const WysiwygCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addWysiwyg("standard_wysiwyg")
	.addWysiwyg("required_wysiwyg", {
		validation: {
			required: true,
		},
	})
	.addWysiwyg("min_length_wysiwyg", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - wysiwyg", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: WysiwygCollection.fields.get("standard_wysiwyg")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: WysiwygCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: WysiwygCollection.fields.get("required_wysiwyg")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: WysiwygCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: WysiwygCollection.fields.get("min_length_wysiwyg")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: WysiwygCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).length(0);
});

test("fail to validate field - wysiwyg", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_wysiwyg",
			type: "wysiwyg",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: WysiwygCollection.fields.get("standard_wysiwyg")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: WysiwygCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_wysiwyg",
			localeCode: "en",
			message: "Invalid input: expected string, received number", // zod error message
		},
	]);

	// Required
	const requiredValidate = {
		exists: validateField({
			field: {
				key: "required_wysiwyg",
				type: "wysiwyg",
				value: undefined,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: WysiwygCollection.fields.get("required_wysiwyg")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: WysiwygCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
		null: validateField({
			field: {
				key: "required_wysiwyg",
				type: "wysiwyg",
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: WysiwygCollection.fields.get("required_wysiwyg")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: WysiwygCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: [
			{
				key: "required_wysiwyg",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
		null: [
			{
				key: "required_wysiwyg",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
	});

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_wysiwyg",
			type: "wysiwyg",
			value: "Hi",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: WysiwygCollection.fields.get("min_length_wysiwyg")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: WysiwygCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_wysiwyg",
			localeCode: "en",
			message: "Too small: expected string to have >=5 characters", // zod error message
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new WysiwygCustomField("field", {
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

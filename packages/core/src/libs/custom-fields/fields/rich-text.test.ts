import { expect, test } from "vitest";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import T from "../../../translations/index.js";
import CustomFieldSchema from "../schema.js";
import RichTextCustomField from "./rich-text.js";

// -----------------------------------------------
// Validation
const RichTextCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addRichText("standard_rich_text")
	.addRichText("required_rich_text", {
		validation: {
			required: true,
		},
	})
	.addRichText("min_length_rich_text", {
		validation: {
			zod: z.object({
				type: z.literal("doc"),
			}),
		},
	});

test("successfully validate field - rich text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("standard_rich_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: RichTextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("required_rich_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: RichTextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("min_length_rich_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: RichTextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).length(0);
});

test("fail to validate field - rich text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_rich_text",
			type: "rich-text",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("standard_rich_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: RichTextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_rich_text",
			localeCode: "en",
			message: "Invalid input: expected record, received number",
		},
	]);

	// Required
	const requiredValidate = {
		exists: validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: undefined,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: RichTextCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
		null: validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
			},
			meta: {
				useTranslations: RichTextCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: [
			{
				key: "required_rich_text",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
		null: [
			{
				key: "required_rich_text",
				localeCode: "en",
				message: T("generic_field_required"),
			},
		],
	});

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_rich_text",
			type: "rich-text",
			value: {
				type: "not_doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("min_length_rich_text")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: RichTextCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_rich_text",
			localeCode: "en",
			message: 'Invalid input: expected "doc" → at type',
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new RichTextCustomField("field", {
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
				type: "doc",
				content: [{ type: "paragraph" }],
			},
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			zod: z.object({
				type: z.literal("doc"),
			}),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

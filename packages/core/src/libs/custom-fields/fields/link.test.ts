import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import LinkCustomField from "./link.js";

// -----------------------------------------------
// Validation
const LinkCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addLink("standard_link")
	.addLink("required_link", {
		validation: {
			required: true,
		},
	});

test("successfully validate field - link", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_link",
			type: "link",
			value: {
				url: "https://example.com",
				target: "_blank",
				label: "Link 1",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: LinkCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_link",
			type: "link",
			value: {
				url: "https://example.com",
				target: "_blank",
				label: "Link 1",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: LinkCollection.fields.get("required_link")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: LinkCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - link", async () => {
	// Standard - Invalid URL
	const invalidUrlValidate = validateField({
		field: {
			key: "standard_link",
			type: "link",
			value: {
				url: false, // invalid
				target: "_blank",
				label: "Link 1",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: LinkCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(invalidUrlValidate).toEqual([
		{
			key: "standard_link",
			localeCode: null,
			message: "Invalid input: expected string, received boolean → at url",
		},
	]);

	// Standard - Invalid Target
	const invalidTargetValidate = validateField({
		field: {
			key: "standard_link",
			type: "link",
			value: {
				url: "https://example.com",
				target: "test", // invalid
				label: "Link 1",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: LinkCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(invalidTargetValidate).toEqual([
		{
			key: "standard_link",
			localeCode: null,
			message: T("field_link_target_error_message", {
				valid: constants.customFields.link.targets.join(", "),
			}),
		},
	]);

	// Standard - Invalid Label
	const invalidLabelValidate = validateField({
		field: {
			key: "standard_link",
			type: "link",
			value: {
				url: "https://example.com",
				target: "_blank",
				label: false, // invalid
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: LinkCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(invalidLabelValidate).toEqual([
		{
			key: "standard_link",
			localeCode: null,
			message: "Invalid input: expected string, received boolean → at label", // zod error message
		},
	]);

	// Required - Empty value
	const requiredValidate = validateField({
		field: {
			key: "required_link",
			type: "link",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: LinkCollection.fields.get("required_link")!,
		validationData: {
			media: [],
			users: [],
			documents: [],
		},
		meta: {
			useTranslations: LinkCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_link",
			localeCode: null,
			message: T("generic_field_required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new LinkCustomField("field", {
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
				url: "https://example.com",
				label: "Link 1",
				target: "_blank",
			},
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

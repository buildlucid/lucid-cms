import { expect, test } from "vitest";
import constants from "../../../../../constants/constants.js";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import LinkCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const LinkCollection = new CollectionBuilder("collection", {
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
	.addLink("standard_link")
	.addLink("required_link", {
		validation: {
			required: true,
		},
	})
	.addLink("required_localized_link", {
		localized: true,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("required_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	const requiredLocalizedValidate = validateField({
		field: {
			key: "required_localized_link",
			type: "link",
			translations: {
				en: {
					url: "https://example.com",
					target: "_blank",
					label: "Link 1",
				},
				fr: {
					url: "https://example.fr",
					target: "_blank",
					label: "Link 1 FR",
				},
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("required_localized_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
			locales: ["en", "fr"],
		},
	});
	expect(requiredLocalizedValidate).length(0);
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(invalidUrlValidate).toEqual([
		{
			key: "standard_link",
			localeCode: null,
			message: copy.literal(
				"Invalid input: expected string, received boolean → at url",
			),
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(invalidTargetValidate).toEqual([
		{
			key: "standard_link",
			localeCode: null,
			message: copy("server:core.fields.link.validation.target.error.message", {
				data: {
					valid: constants.customFields.link.targets.join(", "),
				},
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
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("standard_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(invalidLabelValidate).toEqual([
		{
			key: "standard_link",
			localeCode: null,
			message: copy.literal(
				"Invalid input: expected string, received boolean → at label",
			),
		},
	]);

	// Required - Empty value
	const requiredValidate = validateField({
		field: {
			key: "required_link",
			type: "link",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("required_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_link",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);

	const requiredEmptyLinkValidate = validateField({
		field: {
			key: "required_link",
			type: "link",
			value: {
				url: "   ",
				target: "_self",
				label: "  ",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("required_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredEmptyLinkValidate).toEqual([
		{
			key: "required_link",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);

	const requiredMissingTranslationValidate = validateField({
		field: {
			key: "required_localized_link",
			type: "link",
			translations: {
				en: {
					url: "https://example.com",
					target: "_blank",
					label: "Link 1",
				},
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: LinkCollection.fields.get("required_localized_link")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: LinkCollection.getData.localized,
			defaultLocale: "en",
			locales: ["en", "fr"],
		},
	});
	expect(requiredMissingTranslationValidate).toEqual([
		{
			key: "required_localized_link",
			localeCode: "fr",
			message: copy("server:core.fields.validation.required"),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new LinkCustomField("field", {
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
		default: {
			url: "https://example.com",
			label: "Link 1",
			target: "_blank",
		},
		ui: {
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

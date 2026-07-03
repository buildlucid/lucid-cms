import { expect, test } from "vitest";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";

const TranslatedCollection = new CollectionBuilder("collection", {
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
	.addText("translatable_field")
	.addText("required_translatable_field", {
		validation: {
			required: true,
		},
	})
	.addText("non_translatable_field", {
		localized: false,
	});

const NonTranslatedCollection = new CollectionBuilder("non_translated", {
	mode: "multiple",
	details: {
		name: copy("admin:core.tests.collections.non.translated.name", {
			defaultMessage: "Non-Translated",
		}),
		singularName: copy(
			"admin:core.tests.collections.non.translated.singularName",
			{ defaultMessage: "Non-Translated" },
		),
	},
	localized: false,
}).addText("text_field");

test("localeCode is correctly included or omitted based on translation support", async () => {
	const validationData = {
		media: [],
		user: [],
		document: [],
	};
	const defaultLocale = "en";
	const frenchDefaultLocale = "fr";

	// ---------------
	// Collection and field support translations, with translations object
	const withTranslationsObject = validateField({
		field: {
			key: "translatable_field",
			type: "text",
			translations: {
				en: 123, //* causes fail
				fr: "valid text",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TranslatedCollection.fields.get("translatable_field")!,
		validationData,
		meta: {
			localized: TranslatedCollection.getData.localized,
			defaultLocale,
		},
	});
	expect(withTranslationsObject).toHaveLength(1);
	expect(withTranslationsObject[0]).toMatchObject({
		key: "translatable_field",
		localeCode: "en",
		message: copy.literal("Invalid input: expected string, received number"),
	});

	// ---------------
	// Collection and field support translations, but only a direct value provided (using default locale "en")
	const withDirectValue = validateField({
		field: {
			key: "translatable_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TranslatedCollection.fields.get("translatable_field")!,
		validationData,
		meta: {
			localized: TranslatedCollection.getData.localized,
			defaultLocale,
		},
	});
	expect(withDirectValue).toHaveLength(1);
	expect(withDirectValue[0]).toMatchObject({
		key: "translatable_field",
		localeCode: defaultLocale,
		message: copy.literal("Invalid input: expected string, received number"),
	});

	// ---------------
	// Collection and field support translations, but only a direct value provided (using default locale "fr")
	const withDirectValueFrench = validateField({
		field: {
			key: "translatable_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TranslatedCollection.fields.get("translatable_field")!,
		validationData,
		meta: {
			localized: TranslatedCollection.getData.localized,
			defaultLocale: frenchDefaultLocale,
		},
	});
	expect(withDirectValueFrench).toHaveLength(1);
	expect(withDirectValueFrench[0]).toMatchObject({
		key: "translatable_field",
		localeCode: frenchDefaultLocale,
		message: copy.literal("Invalid input: expected string, received number"),
	});

	// ---------------
	// Collection doesn't support translations
	const nonTranslatedCollection = validateField({
		field: {
			key: "text_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: NonTranslatedCollection.fields.get("text_field")!,
		validationData,
		meta: {
			localized: NonTranslatedCollection.getData.localized,
			defaultLocale,
		},
	});
	expect(nonTranslatedCollection).toHaveLength(1);
	expect(nonTranslatedCollection[0]).toMatchObject({
		key: "text_field",
		localeCode: null,
		message: copy.literal("Invalid input: expected string, received number"),
	});

	// ---------------
	// Field doesn't support translations (even though collection does)
	const nonTranslatableField = validateField({
		field: {
			key: "non_translatable_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TranslatedCollection.fields.get("non_translatable_field")!,
		validationData,
		meta: {
			localized: TranslatedCollection.getData.localized,
			defaultLocale,
		},
	});
	expect(nonTranslatableField).toHaveLength(1);
	expect(nonTranslatableField[0]).toMatchObject({
		key: "non_translatable_field",
		localeCode: null,
		message: copy.literal("Invalid input: expected string, received number"),
	});
});

test("required localized fields validate every configured locale", async () => {
	const validationData = {
		media: [],
		user: [],
		document: [],
	};

	const withMissingTranslation = validateField({
		field: {
			key: "required_translatable_field",
			type: "text",
			translations: {
				en: "English title",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TranslatedCollection.fields.get("required_translatable_field")!,
		validationData,
		meta: {
			localized: TranslatedCollection.getData.localized,
			defaultLocale: "en",
			locales: ["en", "fr"],
		},
	});
	expect(withMissingTranslation).toEqual([
		{
			key: "required_translatable_field",
			localeCode: "fr",
			message: copy("server:core.fields.validation.required"),
		},
	]);

	const withDirectValue = validateField({
		field: {
			key: "required_translatable_field",
			type: "text",
			value: "English title",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TranslatedCollection.fields.get("required_translatable_field")!,
		validationData,
		meta: {
			localized: TranslatedCollection.getData.localized,
			defaultLocale: "en",
			locales: ["en", "fr"],
		},
	});
	expect(withDirectValue).toEqual([
		{
			key: "required_translatable_field",
			localeCode: "fr",
			message: copy("server:core.fields.validation.required"),
		},
	]);
});

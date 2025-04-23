import { expect, test } from "vitest";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";

const TranslatedCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addText("translatable_field")
	.addText("non_translatable_field", {
		config: {
			useTranslations: false,
		},
	});

const NonTranslatedCollection = new CollectionBuilder("non_translated", {
	mode: "multiple",
	details: {
		name: "Non-Translated",
		singularName: "Non-Translated",
	},
	config: {
		useTranslations: false,
	},
}).addText("text_field");

test("localeCode is correctly included or omitted based on translation support", async () => {
	const validationData = {
		media: [],
		users: [],
		documents: [],
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
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TranslatedCollection.fields.get("translatable_field")!,
		validationData,
		meta: {
			useTranslations: TranslatedCollection.getData.config.useTranslations,
			defaultLocale,
		},
	});
	expect(withTranslationsObject).toHaveLength(1);
	expect(withTranslationsObject[0]).toMatchObject({
		key: "translatable_field",
		localeCode: "en",
		message: "Invalid input: expected string, received number", // zod error message
	});

	// ---------------
	// Collection and field support translations, but only a direct value provided (using default locale "en")
	const withDirectValue = validateField({
		field: {
			key: "translatable_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TranslatedCollection.fields.get("translatable_field")!,
		validationData,
		meta: {
			useTranslations: TranslatedCollection.getData.config.useTranslations,
			defaultLocale,
		},
	});
	expect(withDirectValue).toHaveLength(1);
	expect(withDirectValue[0]).toMatchObject({
		key: "translatable_field",
		localeCode: defaultLocale,
		message: "Invalid input: expected string, received number", // zod error message
	});

	// ---------------
	// Collection and field support translations, but only a direct value provided (using default locale "fr")
	const withDirectValueFrench = validateField({
		field: {
			key: "translatable_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TranslatedCollection.fields.get("translatable_field")!,
		validationData,
		meta: {
			useTranslations: TranslatedCollection.getData.config.useTranslations,
			defaultLocale: frenchDefaultLocale,
		},
	});
	expect(withDirectValueFrench).toHaveLength(1);
	expect(withDirectValueFrench[0]).toMatchObject({
		key: "translatable_field",
		localeCode: frenchDefaultLocale,
		message: "Invalid input: expected string, received number", // zod error message
	});

	// ---------------
	// Collection doesn't support translations
	const nonTranslatedCollection = validateField({
		field: {
			key: "text_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: NonTranslatedCollection.fields.get("text_field")!,
		validationData,
		meta: {
			useTranslations: NonTranslatedCollection.getData.config.useTranslations,
			defaultLocale,
		},
	});
	expect(nonTranslatedCollection).toHaveLength(1);
	expect(nonTranslatedCollection[0]).toMatchObject({
		key: "text_field",
		localeCode: null,
		message: "Invalid input: expected string, received number", // zod error message
	});

	// ---------------
	// Field doesn't support translations (even though collection does)
	const nonTranslatableField = validateField({
		field: {
			key: "non_translatable_field",
			type: "text",
			value: 123, //* causes fail
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: TranslatedCollection.fields.get("non_translatable_field")!,
		validationData,
		meta: {
			useTranslations: TranslatedCollection.getData.config.useTranslations,
			defaultLocale,
		},
	});
	expect(nonTranslatableField).toHaveLength(1);
	expect(nonTranslatableField[0]).toMatchObject({
		key: "non_translatable_field",
		localeCode: null,
		message: "Invalid input: expected string, received number", // zod error message
	});
});

import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import T from "../../../../../translations/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import UserCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const UserCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addUser("standard_user")
	.addUser("required_user", {
		validation: {
			required: true,
		},
	})
	.addUser("multi_user", {
		config: {
			multiple: true,
		},
		validation: {
			minItems: 2,
			maxItems: 3,
		},
	});

test("successfully validate field - user", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_user",
			type: "user",
			value: [1],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: UserCollection.fields.get("standard_user")!,
		validationData: {
			media: [],
			user: [
				{
					id: 1,
					// email: "test@test.com",
					// first_name: "Test",
					// last_name: "User",
					// username: "test-user",
				},
			],
			document: [],
		},
		meta: {
			useTranslations: UserCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_user",
			type: "user",
			value: [1],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: UserCollection.fields.get("required_user")!,
		validationData: {
			media: [],
			user: [
				{
					id: 1,
					// email: "test@test.com",
					// first_name: "Test",
					// last_name: "User",
					// username: "test-user",
				},
			],
			document: [],
		},
		meta: {
			useTranslations: UserCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - user", async () => {
	// Required
	const requiredValidate = {
		exists: validateField({
			field: {
				key: "required_user",
				type: "user",
				value: [1],
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: UserCollection.fields.get("required_user")!,
			validationData: {
				media: [],
				user: [],
				document: [],
			},
			meta: {
				useTranslations: UserCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
		null: validateField({
			field: {
				key: "required_user",
				type: "user",
				value: [],
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: UserCollection.fields.get("required_user")!,
			validationData: {
				media: [],
				user: [],
				document: [],
			},
			meta: {
				useTranslations: UserCollection.getData.config.useTranslations,
				defaultLocale: "en",
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: [
			{
				key: "required_user",
				localeCode: null,
				message: T("field_user_not_found"),
				itemIndex: 0,
			},
		],
		null: [
			{
				key: "required_user",
				localeCode: null,
				message: T("generic_field_required"),
			},
		],
	});
});

test("user field validates multiple item counts and indexed errors", async () => {
	const minItemsValidate = validateField({
		field: {
			key: "multi_user",
			type: "user",
			value: [1],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: UserCollection.fields.get("multi_user")!,
		validationData: {
			media: [],
			user: [{ id: 1 }],
			document: [],
		},
		meta: {
			useTranslations: UserCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	const maxItemsValidate = validateField({
		field: {
			key: "multi_user",
			type: "user",
			value: [1, 2, 3, 4],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: UserCollection.fields.get("multi_user")!,
		validationData: {
			media: [],
			user: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
			document: [],
		},
		meta: {
			useTranslations: UserCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});
	const indexedValidate = validateField({
		field: {
			key: "multi_user",
			type: "user",
			value: [1, 99, 100],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: UserCollection.fields.get("multi_user")!,
		validationData: {
			media: [],
			user: [{ id: 1 }],
			document: [],
		},
		meta: {
			useTranslations: UserCollection.getData.config.useTranslations,
			defaultLocale: "en",
		},
	});

	expect(minItemsValidate).toEqual([
		{
			key: "multi_user",
			localeCode: null,
			message: T("field_relation_min_items", {
				min: 2,
			}),
		},
	]);
	expect(maxItemsValidate).toEqual([
		{
			key: "multi_user",
			localeCode: null,
			message: T("field_relation_max_items", {
				max: 3,
			}),
		},
	]);
	expect(indexedValidate).toEqual([
		{
			key: "multi_user",
			localeCode: null,
			message: T("field_user_not_found"),
			itemIndex: 1,
		},
		{
			key: "multi_user",
			localeCode: null,
			message: T("field_user_not_found"),
			itemIndex: 2,
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new UserCustomField("field", {
		details: {
			label: {
				en: "title",
			},
			summary: {
				en: "description",
			},
		},
		config: {
			useTranslations: true,
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

test("user field controls its grouped validation input", () => {
	const singleField = new UserCustomField("single_user", {
		config: {
			multiple: false,
		},
	});
	const multipleField = new UserCustomField("multiple_user", {
		config: {
			multiple: true,
		},
	});

	expect(singleField.getRelationFieldValidationInput([1, 2, 3])).toEqual({
		default: [1],
	});
	expect(multipleField.getRelationFieldValidationInput([1, 2, 3])).toEqual({
		default: [1, 2, 3],
	});
});

test("multiple config controls how many user IDs are kept", () => {
	const singleField = new UserCustomField("single_user", {
		config: {
			multiple: false,
		},
	});
	const multipleField = new UserCustomField("multiple_user", {
		config: {
			multiple: true,
		},
	});

	expect(singleField.normalizeInputValue([1, 2, 3])).toEqual([1]);
	expect(singleField.formatResponseValue([1, 2, 3])).toEqual([1]);
	expect(multipleField.normalizeInputValue([1, 2, 3])).toEqual([1, 2, 3]);
	expect(multipleField.formatResponseValue([1, 2, 3])).toEqual([1, 2, 3]);
	expect(singleField.validate({ type: "user", value: 1 }).valid).toBe(false);
});

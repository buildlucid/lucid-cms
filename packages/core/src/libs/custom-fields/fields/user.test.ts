import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import UserCustomField from "./user.js";

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
	});

test("successfully validate field - user", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_user",
			type: "user",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: UserCollection.fields.get("standard_user")!,
		validationData: {
			media: [],
			users: [
				{
					id: 1,
					// email: "test@test.com",
					// first_name: "Test",
					// last_name: "User",
					// username: "test-user",
				},
			],
			documents: [],
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
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		instance: UserCollection.fields.get("required_user")!,
		validationData: {
			media: [],
			users: [
				{
					id: 1,
					// email: "test@test.com",
					// first_name: "Test",
					// last_name: "User",
					// username: "test-user",
				},
			],
			documents: [],
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
				value: 1,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: UserCollection.fields.get("required_user")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
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
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			instance: UserCollection.fields.get("required_user")!,
			validationData: {
				media: [],
				users: [],
				documents: [],
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

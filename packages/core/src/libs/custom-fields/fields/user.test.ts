import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import UserCustomField from "./user.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const UserCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	title: "Test",
	singular: "Test",
	useTranslations: true,
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
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_user",
			type: "user",
			value: 1,
			localeCode: "en",
		},
		instance: UserCollection,
		data: {
			media: [],
			users: [
				{
					id: 1,
					email: "test@test.com",
					first_name: "Test",
					last_name: "User",
					username: "test-user",
				},
			],
			documents: [],
		},
	});
	expect(standardValidate).toBe(null);

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_user",
			type: "user",
			value: 1,
			localeCode: "en",
		},
		instance: UserCollection,
		data: {
			media: [],
			users: [
				{
					id: 1,
					email: "test@test.com",
					first_name: "Test",
					last_name: "User",
					username: "test-user",
				},
			],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);
});

test("fail to validate field - user", async () => {
	// Required
	const requiredValidate = {
		exists: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_user",
				type: "user",
				value: 1,
				localeCode: "en",
			},
			instance: UserCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		null: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_user",
				type: "user",
				value: null,
				localeCode: "en",
			},
			instance: UserCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: {
			key: "required_user",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("field_user_not_found"),
		},
		null: {
			key: "required_user",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new UserCustomField("field", {
		labels: {
			title: {
				en: "title",
			},
			description: {
				en: "description",
			},
		},
		translations: true,
		hidden: false,
		disabled: false,
		validation: {
			required: true,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

import T from "../../../translations/index.js";
import { expect, test } from "vitest";
import CustomFieldSchema from "../schema.js";
import DocumentCustomField from "./document.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const DocumentCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addDocument("standard_doc", {
		collection: "page",
	})
	.addDocument("required_doc", {
		collection: "page",
		validation: {
			required: true,
		},
	})
	.addDocument("wrong_collection", {
		collection: "wrong_collection",
		validation: {
			required: true,
		},
	});

test("successfully validate field - document", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_doc",
			type: "document",
			value: 1,
			localeCode: "en",
		},
		instance: DocumentCollection,
		data: {
			media: [],
			users: [],
			documents: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
	});
	expect(standardValidate).toBe(null);

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_doc",
			type: "document",
			value: 1,
			localeCode: "en",
		},
		instance: DocumentCollection,
		data: {
			media: [],
			users: [],
			documents: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
	});
	expect(requiredValidate).toBe(null);
});

test("fail to validate field - document", async () => {
	// Required
	const requiredValidate = {
		exists: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_doc",
				type: "document",
				value: 1,
				localeCode: "en",
			},
			instance: DocumentCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		null: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "required_doc",
				type: "document",
				value: null,
				localeCode: "en",
			},
			instance: DocumentCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(requiredValidate).toEqual({
		exists: {
			key: "required_doc",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("field_document_not_found"),
		},
		null: {
			key: "required_doc",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("generic_field_required"),
		},
	});

	// Wrong collection
	const wrongCollectionValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "wrong_collection",
			type: "document",
			value: 1,
			localeCode: "en",
		},
		instance: DocumentCollection,
		data: {
			media: [],
			users: [],
			documents: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
	});
	expect(wrongCollectionValidate).toEqual({
		key: "wrong_collection",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("field_document_collection_key_mismatch", {
			received: "page",
			expected: "wrong_collection",
		}),
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new DocumentCustomField("field", {
		collection: "page",
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

import T from "../../../translations/index.js";
import { expect, test } from "vitest";
import CustomFieldSchema from "../schema.js";
import DocumentCustomField from "./document.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";

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
	const standardValidate = validateField(
		{
			key: "standard_doc",
			type: "document",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DocumentCollection.fields.get("standard_doc")!,
		{
			media: [],
			users: [],
			documents: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
	);
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField(
		{
			key: "required_doc",
			type: "document",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DocumentCollection.fields.get("required_doc")!,
		{
			media: [],
			users: [],
			documents: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
	);
	expect(requiredValidate).length(0);
});

test("fail to validate field - document", async () => {
	// Required - document not found
	const requiredExistsValidate = validateField(
		{
			key: "required_doc",
			type: "document",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DocumentCollection.fields.get("required_doc")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredExistsValidate).toEqual([
		{
			key: "required_doc",
			message: T("field_document_not_found"),
		},
	]);

	// Required - null value
	const requiredNullValidate = validateField(
		{
			key: "required_doc",
			type: "document",
			value: null,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DocumentCollection.fields.get("required_doc")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredNullValidate).toEqual([
		{
			key: "required_doc",
			message: T("generic_field_required"),
		},
	]);

	// Wrong collection
	const wrongCollectionValidate = validateField(
		{
			key: "wrong_collection",
			type: "document",
			value: 1,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		DocumentCollection.fields.get("wrong_collection")!,
		{
			media: [],
			users: [],
			documents: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
	);
	expect(wrongCollectionValidate).toEqual([
		{
			key: "wrong_collection",
			message: T("field_document_not_found"),
		},
	]);
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

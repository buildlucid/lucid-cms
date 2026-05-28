import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { adminText, serverText } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import DocumentCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const DocumentCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: adminText("tests.collections.collection.name", { fallback: "Test" }),
		singularName: adminText("tests.collections.collection.singularName", {
			fallback: "Test",
		}),
	},
	config: {
		localized: true,
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
	})
	.addDocument("multi_doc", {
		collection: "page",
		config: {
			multiple: true,
		},
		validation: {
			minItems: 2,
			maxItems: 3,
		},
	})
	.addDocument("multi_collection_doc", {
		collection: ["page", "blog"],
		config: {
			multiple: true,
		},
	});

test("successfully validate field - document", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_doc",
			type: "document",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("standard_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_doc",
			type: "document",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("required_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - document", async () => {
	// Required - document not found
	const requiredExistsValidate = validateField({
		field: {
			key: "required_doc",
			type: "document",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("required_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredExistsValidate).toEqual([
		{
			key: "required_doc",
			localeCode: null,
			message: serverText("core.fields.document.validation.not.found"),
			itemIndex: 0,
		},
	]);

	// Required - null value
	const requiredNullValidate = validateField({
		field: {
			key: "required_doc",
			type: "document",
			value: [],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("required_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredNullValidate).toEqual([
		{
			key: "required_doc",
			localeCode: null,
			message: serverText("core.fields.validation.required"),
		},
	]);

	// Wrong collection
	const wrongCollectionValidate = validateField({
		field: {
			key: "wrong_collection",
			type: "document",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("wrong_collection")!,
		validationData: {
			media: [],
			user: [],
			document: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	expect(wrongCollectionValidate).toEqual([
		{
			key: "wrong_collection",
			localeCode: null,
			message: serverText("core.fields.document.validation.not.found"),
			itemIndex: 0,
		},
	]);
});

test("document field validates multiple item counts and indexed errors", async () => {
	const minItemsValidate = validateField({
		field: {
			key: "multi_doc",
			type: "document",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [{ id: 1, collection_key: "page" }],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	const maxItemsValidate = validateField({
		field: {
			key: "multi_doc",
			type: "document",
			value: [
				{ id: 1, collectionKey: "page" },
				{ id: 2, collectionKey: "page" },
				{ id: 3, collectionKey: "page" },
				{ id: 4, collectionKey: "page" },
			],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [
				{ id: 1, collection_key: "page" },
				{ id: 2, collection_key: "page" },
				{ id: 3, collection_key: "page" },
				{ id: 4, collection_key: "page" },
			],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	const indexedValidate = validateField({
		field: {
			key: "multi_doc",
			type: "document",
			value: [
				{ id: 1, collectionKey: "page" },
				{ id: 99, collectionKey: "page" },
				{ id: 100, collectionKey: "blog" },
			],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [{ id: 1, collection_key: "page" }],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});

	expect(minItemsValidate).toEqual([
		{
			key: "multi_doc",
			localeCode: null,
			message: serverText("core.fields.relation.validation.min.items", {
				data: {
					min: 2,
				},
			}),
		},
	]);
	expect(maxItemsValidate).toEqual([
		{
			key: "multi_doc",
			localeCode: null,
			message: serverText("core.fields.relation.validation.max.items", {
				data: {
					max: 3,
				},
			}),
		},
	]);
	expect(indexedValidate).toEqual([
		{
			key: "multi_doc",
			localeCode: null,
			message: serverText("core.fields.document.validation.not.found"),
			itemIndex: 1,
		},
		{
			key: "multi_doc",
			localeCode: null,
			message: serverText("core.fields.document.validation.not.found"),
			itemIndex: 2,
		},
	]);
});

test("document field validates multiple target collections", async () => {
	const allowedValidate = validateField({
		field: {
			key: "multi_collection_doc",
			type: "document",
			value: [
				{ id: 1, collectionKey: "page" },
				{ id: 2, collectionKey: "blog" },
			],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_collection_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [
				{ id: 1, collection_key: "page" },
				{ id: 2, collection_key: "blog" },
			],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});
	const disallowedValidate = validateField({
		field: {
			key: "multi_collection_doc",
			type: "document",
			value: [{ id: 1, collectionKey: "author" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_collection_doc")!,
		validationData: {
			media: [],
			user: [],
			document: [{ id: 1, collection_key: "author" }],
		},
		meta: {
			localized: DocumentCollection.getData.config.localized,
			defaultLocale: "en",
		},
	});

	expect(allowedValidate).toEqual([]);
	expect(disallowedValidate).toEqual([
		{
			key: "multi_collection_doc",
			localeCode: null,
			message: serverText("core.fields.document.validation.not.found"),
			itemIndex: 0,
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new DocumentCustomField("field", {
		collection: "page",
		details: {
			label: adminText("tests.fields.field.label", {
				fallback: "title",
			}),
			summary: adminText("tests.fields.field.summary", {
				fallback: "description",
			}),
		},
		config: {
			localized: true,
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

test("custom field config supports multiple target collections", async () => {
	const field = new DocumentCustomField("field", {
		collection: ["page", "blog"],
		config: {
			default: [
				{
					id: 1,
					collectionKey: "page",
				},
				{
					id: 2,
					collectionKey: "blog",
				},
			],
			multiple: true,
		},
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);

	expect(res.success).toBe(true);
	expect(field.defaultValue).toEqual([
		{ id: 1, collectionKey: "page" },
		{ id: 2, collectionKey: "blog" },
	]);
});

test("document field controls its grouped validation input", () => {
	const singleField = new DocumentCustomField("single_doc", {
		collection: "page",
		config: {
			multiple: false,
		},
	});
	const multipleField = new DocumentCustomField("multiple_doc", {
		collection: "page",
		config: {
			multiple: true,
		},
	});

	expect(
		singleField.getRelationFieldValidationInput([
			{ id: 1, collectionKey: "page" },
			{ id: 2, collectionKey: "blog" },
		]),
	).toEqual({
		page: [1],
	});
	expect(
		multipleField.getRelationFieldValidationInput([
			{ id: 1, collectionKey: "page" },
			{ id: 2, collectionKey: "blog" },
			{ id: 3, collectionKey: "page" },
		]),
	).toEqual({
		page: [1, 3],
		blog: [2],
	});
});

test("multiple config controls how many document IDs are kept", () => {
	const singleField = new DocumentCustomField("single_doc", {
		collection: "page",
		config: {
			multiple: false,
		},
	});
	const multipleField = new DocumentCustomField("multiple_doc", {
		collection: "page",
		config: {
			multiple: true,
		},
	});

	const values = [
		{ id: 1, collectionKey: "page" },
		{ id: 2, collectionKey: "page" },
		{ id: 3, collectionKey: "page" },
	];

	expect(singleField.normalizeInputValue(values)).toEqual([values[0]]);
	expect(singleField.formatResponseValue(values)).toEqual([values[0]]);
	expect(multipleField.normalizeInputValue(values)).toEqual(values);
	expect(multipleField.formatResponseValue(values)).toEqual(values);
	expect(singleField.validate({ type: "document", value: 1 }).valid).toBe(
		false,
	);
});

import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import RelationCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const DocumentCollection = new CollectionBuilder("collection", {
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
	.addRelation("standard_doc", {
		collection: "page",
	})
	.addRelation("required_doc", {
		collection: "page",
		validation: {
			required: true,
		},
	})
	.addRelation("wrong_collection", {
		collection: "wrong_collection",
		validation: {
			required: true,
		},
	})
	.addRelation("multi_doc", {
		collection: "page",
		multiple: true,
		validation: {
			minItems: 2,
			maxItems: 3,
		},
	})
	.addRelation("multi_collection_doc", {
		collection: ["page", "blog"],
		multiple: true,
	});

test("successfully validate field - relation", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_doc",
			type: "relation",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("standard_doc")!,
		validationData: {
			media: [],
			user: [],
			relation: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_doc",
			type: "relation",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("required_doc")!,
		validationData: {
			media: [],
			user: [],
			relation: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);
});

test("fail to validate field - relation", async () => {
	// Required - relation target not found
	const requiredExistsValidate = validateField({
		field: {
			key: "required_doc",
			type: "relation",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("required_doc")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredExistsValidate).toEqual([
		{
			key: "required_doc",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			itemIndex: 0,
		},
	]);

	// Required - null value
	const requiredNullValidate = validateField({
		field: {
			key: "required_doc",
			type: "relation",
			value: [],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("required_doc")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredNullValidate).toEqual([
		{
			key: "required_doc",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);

	// Wrong collection
	const wrongCollectionValidate = validateField({
		field: {
			key: "wrong_collection",
			type: "relation",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("wrong_collection")!,
		validationData: {
			media: [],
			user: [],
			relation: [
				{
					id: 1,
					collection_key: "page",
				},
			],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(wrongCollectionValidate).toEqual([
		{
			key: "wrong_collection",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			itemIndex: 0,
		},
	]);
});

test("relation field validates multiple item counts and indexed errors", async () => {
	const minItemsValidate = validateField({
		field: {
			key: "multi_doc",
			type: "relation",
			value: [{ id: 1, collectionKey: "page" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_doc")!,
		validationData: {
			media: [],
			user: [],
			relation: [{ id: 1, collection_key: "page" }],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	const maxItemsValidate = validateField({
		field: {
			key: "multi_doc",
			type: "relation",
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
			relation: [
				{ id: 1, collection_key: "page" },
				{ id: 2, collection_key: "page" },
				{ id: 3, collection_key: "page" },
				{ id: 4, collection_key: "page" },
			],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	const indexedValidate = validateField({
		field: {
			key: "multi_doc",
			type: "relation",
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
			relation: [{ id: 1, collection_key: "page" }],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});

	expect(minItemsValidate).toEqual([
		{
			key: "multi_doc",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.min.items", {
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
			message: copy("server:core.fields.relation.validation.max.items", {
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
			message: copy("server:core.fields.relation.validation.not.found"),
			itemIndex: 1,
		},
		{
			key: "multi_doc",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			itemIndex: 2,
		},
	]);
});

test("relation field validates multiple target collections", async () => {
	const allowedValidate = validateField({
		field: {
			key: "multi_collection_doc",
			type: "relation",
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
			relation: [
				{ id: 1, collection_key: "page" },
				{ id: 2, collection_key: "blog" },
			],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	const disallowedValidate = validateField({
		field: {
			key: "multi_collection_doc",
			type: "relation",
			value: [{ id: 1, collectionKey: "author" }],
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: DocumentCollection.fields.get("multi_collection_doc")!,
		validationData: {
			media: [],
			user: [],
			relation: [{ id: 1, collection_key: "author" }],
		},
		meta: {
			localized: DocumentCollection.getData.localized,
			defaultLocale: "en",
		},
	});

	expect(allowedValidate).toEqual([]);
	expect(disallowedValidate).toEqual([
		{
			key: "multi_collection_doc",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			itemIndex: 0,
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new RelationCustomField("field", {
		collection: "page",
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "title",
			}),
			summary: copy("admin:tests.fields.field.summary", {
				defaultMessage: "description",
			}),
		},
		localized: true,
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

test("custom field config supports multiple target collections", async () => {
	const field = new RelationCustomField("field", {
		collection: ["page", "blog"],
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
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);

	expect(res.success).toBe(true);
	expect(field.defaultValue).toEqual([
		{ id: 1, collectionKey: "page" },
		{ id: 2, collectionKey: "blog" },
	]);
});

test("relation field controls its grouped validation input", () => {
	const singleField = new RelationCustomField("single_doc", {
		collection: "page",
		multiple: false,
	});
	const multipleField = new RelationCustomField("multiple_doc", {
		collection: "page",
		multiple: true,
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

test("multiple config controls how many relation values are kept", () => {
	const singleField = new RelationCustomField("single_doc", {
		collection: "page",
		multiple: false,
	});
	const multipleField = new RelationCustomField("multiple_doc", {
		collection: "page",
		multiple: true,
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
	expect(singleField.validate({ type: "relation", value: 1 }).valid).toBe(
		false,
	);
});

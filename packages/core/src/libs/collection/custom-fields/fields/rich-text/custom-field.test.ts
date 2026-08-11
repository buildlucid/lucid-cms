import { expect, test } from "vitest";
import z from "zod";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import RichTextCustomField from "./custom-field.js";
import type { RichTextValidationData } from "./types.js";

// -----------------------------------------------
// Validation
const RichTextCollection = new CollectionBuilder("collection", {
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
	.addRichText("standard_rich_text")
	.addRichText("required_rich_text", {
		validation: {
			required: true,
		},
	})
	.addRichText("min_length_rich_text", {
		validation: {
			zod: z.object({
				type: z.literal("doc"),
			}),
		},
	});

test("successfully validate field - rich text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("standard_rich_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: RichTextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Required content" }],
					},
				],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("required_rich_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: RichTextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	for (const type of [
		"lucidDocument",
		"lucidMedia",
		"lucidVariable",
		"lucidEmbeddedBrick",
	]) {
		const atomValidate = validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: {
					type: "doc",
					content: [{ type }],
				},
			},
			// biome-ignore lint/style/noNonNullAssertion: test collection always registers this field
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: RichTextCollection.getData.localized,
				defaultLocale: "en",
			},
		});
		expect(atomValidate).toHaveLength(0);
	}

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("min_length_rich_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: RichTextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).length(0);
});

test("fail to validate field - rich text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_rich_text",
			type: "rich-text",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("standard_rich_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: RichTextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_rich_text",
			localeCode: "en",
			message: copy.literal("Invalid input: expected record, received number"),
		},
	]);

	// Required
	const requiredValidate = {
		empty: validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: {
					type: "doc",
					content: [{ type: "paragraph" }],
				},
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: RichTextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
		emptyNestedNodes: validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: {
					type: "doc",
					content: [
						{
							type: "bulletList",
							content: [
								{
									type: "listItem",
									content: [{ type: "paragraph" }],
								},
							],
						},
					],
				},
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: RichTextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
		exists: validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: undefined,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: RichTextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
		null: validateField({
			field: {
				key: "required_rich_text",
				type: "rich-text",
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: RichTextCollection.fields.get("required_rich_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: RichTextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
	};
	expect(requiredValidate).toEqual({
		empty: [
			{
				key: "required_rich_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
		emptyNestedNodes: [
			{
				key: "required_rich_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
		exists: [
			{
				key: "required_rich_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
		null: [
			{
				key: "required_rich_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
	});

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_rich_text",
			type: "rich-text",
			value: {
				type: "not_doc",
				content: [{ type: "paragraph" }],
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: RichTextCollection.fields.get("min_length_rich_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: RichTextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_rich_text",
			localeCode: "en",
			message: copy.literal('Invalid input: expected "doc" → at type'),
		},
	]);
});

const referenceField = new RichTextCustomField("references", {
	localized: false,
	editor: {
		media: ["image"],
		documents: ["pages"],
		variables: {
			document: ["settings"],
			user: ["username"],
		},
		links: { internal: ["pages"] },
		bricks: ["card"],
	},
});

const referenceValue = {
	type: "doc",
	content: [
		{ type: "lucidMedia", attrs: { mediaId: 11 } },
		{
			type: "lucidDocument",
			attrs: { collectionKey: "pages", documentId: 44 },
		},
		{
			type: "lucidVariable",
			attrs: {
				source: "document",
				collectionKey: "settings",
				documentId: 22,
				fieldKey: "siteName",
			},
		},
		{
			type: "lucidVariable",
			attrs: {
				source: "user",
				userId: 55,
				fieldKey: "username",
			},
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "About",
					marks: [
						{
							type: "link",
							attrs: {
								kind: "document",
								collectionKey: "pages",
								documentId: 33,
							},
						},
					],
				},
			],
		},
		{ type: "lucidEmbeddedBrick", attrs: { ref: "card-ref" } },
	],
};

const referenceValidationData: RichTextValidationData = {
	media: [
		{
			id: 11,
			type: "image",
			file_extension: "jpg",
			width: 1200,
			height: 800,
		},
	],
	documents: [
		{ id: 22, collection_key: "settings" },
		{ id: 33, collection_key: "pages" },
		{ id: 44, collection_key: "pages" },
	],
	users: [{ id: 55 }],
	variableAccess: {
		documentCollectionKeys: ["settings"],
		users: true,
	},
	collections: {
		settings: {
			fields: [
				{
					key: "siteName",
					type: "text",
					treeParent: null,
					structuralParent: null,
				},
			],
		},
		pages: { fields: [] },
	},
	embeddedBricks: { "card-ref": "card" },
	cyclicEmbeddedBricks: [],
};

test("validates rich-text reference targets", () => {
	expect(
		referenceField.getRelationFieldValidationInput(referenceValue),
	).toEqual({
		media: [11],
		"document:settings": [22],
		"document:pages": [44, 33],
		user: [55],
	});

	const errors = validateField({
		field: { key: "references", type: "rich-text", value: referenceValue },
		instance: referenceField,
		validationData: { "rich-text": referenceValidationData },
		meta: { localized: false, defaultLocale: "en" },
	});

	expect(errors).toEqual([]);
});

test("enforces the reference types configured for the rich-text editor", () => {
	const errors = validateField({
		field: { key: "references", type: "rich-text", value: referenceValue },
		instance: referenceField,
		validationData: {
			"rich-text": {
				...referenceValidationData,
				media: [{ ...referenceValidationData.media[0], type: "video" }],
				collections: {
					...referenceValidationData.collections,
					settings: {
						fields: [
							{
								key: "siteName",
								type: "repeater",
								treeParent: null,
								structuralParent: null,
							},
						],
					},
				},
				embeddedBricks: { "card-ref": "hero" },
			},
		},
		meta: { localized: false, defaultLocale: "en" },
	});

	expect(errors.map((error) => error.message)).toEqual([
		copy("server:core.fields.rich.text.media.not.allowed"),
		copy("server:core.fields.rich.text.variable.field.not.found"),
		copy("server:core.fields.rich.text.embedded.brick.not.allowed"),
	]);
});

test("rejects user variable fields that are not explicitly allowed", () => {
	const errors = validateField({
		field: {
			key: "references",
			type: "rich-text",
			value: {
				type: "doc",
				content: [
					{
						type: "lucidVariable",
						attrs: {
							source: "user",
							userId: 55,
							fieldKey: "email",
						},
					},
				],
			},
		},
		instance: referenceField,
		validationData: { "rich-text": referenceValidationData },
		meta: { localized: false, defaultLocale: "en" },
	});

	expect(errors).toEqual([
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.rich.text.variable.not.allowed"),
			meta: {
				reference: {
					type: "rich-text-variable",
					source: "user",
					userId: 55,
					fieldKey: "email",
				},
			},
		},
	]);
});

test("requires read permission for rich-text variable targets", () => {
	const errors = validateField({
		field: { key: "references", type: "rich-text", value: referenceValue },
		instance: referenceField,
		validationData: {
			"rich-text": {
				...referenceValidationData,
				variableAccess: {
					documentCollectionKeys: [],
					users: false,
				},
			},
		},
		meta: { localized: false, defaultLocale: "en" },
	});

	expect(errors).toEqual([
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.rich.text.variable.permission.denied"),
			meta: {
				reference: {
					type: "rich-text-variable",
					source: "document",
					collectionKey: "settings",
					documentId: 22,
					fieldKey: "siteName",
				},
			},
		},
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.rich.text.variable.permission.denied"),
			meta: {
				reference: {
					type: "rich-text-variable",
					source: "user",
					userId: 55,
					fieldKey: "username",
				},
			},
		},
	]);
});

test("returns reference metadata for missing rich-text targets", () => {
	const errors = validateField({
		field: {
			key: "references",
			type: "rich-text",
			value: {
				...referenceValue,
				content: [
					...referenceValue.content,
					{ type: "lucidMedia", attrs: { mediaId: 11 } },
				],
			},
		},
		instance: referenceField,
		validationData: {
			"rich-text": {
				...referenceValidationData,
				media: [],
				documents: [],
				users: [],
				embeddedBricks: {},
			},
		},
		meta: { localized: false, defaultLocale: "en" },
	});

	expect(errors).toEqual([
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.media.validation.not.found"),
			meta: { reference: { type: "rich-text-media", mediaId: 11 } },
		},
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			meta: {
				reference: {
					type: "rich-text-document",
					collectionKey: "pages",
					documentId: 44,
				},
			},
		},
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			meta: {
				reference: {
					type: "rich-text-variable",
					source: "document",
					collectionKey: "settings",
					documentId: 22,
					fieldKey: "siteName",
				},
			},
		},
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.user.validation.not.found"),
			meta: {
				reference: {
					type: "rich-text-variable",
					source: "user",
					userId: 55,
					fieldKey: "username",
				},
			},
		},
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.not.found"),
			meta: {
				reference: {
					type: "rich-text-document-link",
					collectionKey: "pages",
					documentId: 33,
				},
			},
		},
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.rich.text.embedded.brick.not.found"),
			meta: {
				reference: { type: "rich-text-embedded-brick", ref: "card-ref" },
			},
		},
	]);
});

test("rejects cyclic embedded-brick references", () => {
	const errors = validateField({
		field: {
			key: "references",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "lucidEmbeddedBrick", attrs: { ref: "card-ref" } }],
			},
		},
		instance: referenceField,
		validationData: {
			"rich-text": {
				...referenceValidationData,
				cyclicEmbeddedBricks: ["card-ref"],
			},
		},
		meta: { localized: false, defaultLocale: "en" },
	});

	expect(errors).toEqual([
		{
			key: "references",
			localeCode: null,
			message: copy("server:core.fields.rich.text.embedded.brick.cyclic"),
			meta: {
				reference: { type: "rich-text-embedded-brick", ref: "card-ref" },
			},
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new RichTextCustomField("field", {
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
			type: "doc",
			content: [{ type: "paragraph" }],
		},
		ui: {
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
			zod: z.object({
				type: z.literal("doc"),
			}),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

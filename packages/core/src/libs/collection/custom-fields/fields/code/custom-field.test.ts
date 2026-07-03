import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import type DatabaseAdapter from "../../../../db/adapter-base.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import generateCollectionClientTypes from "../../../type-gen/index.js";
import CustomFieldSchema from "../../schema.js";
import CodeCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const CodeCollection = new CollectionBuilder("collection", {
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
	.addCode("standard_code")
	.addCode("required_code", {
		validation: {
			required: true,
		},
	})
	.addCode("restricted_code", {
		languages: ["javascript", "typescript"],
	});

const validationData = {
	media: [],
	user: [],
	document: [],
};
const validationMeta = {
	localized: CodeCollection.getData.localized,
	defaultLocale: "en",
};

test("successfully validate field - code", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_code",
			type: "code",
			value: {
				language: "typescript",
				value: "const a: number = 1;",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("standard_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(standardValidate).length(0);

	// Empty
	const standardEmptyValidate = validateField({
		field: {
			key: "standard_code",
			type: "code",
			value: "",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("standard_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(standardEmptyValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_code",
			type: "code",
			value: {
				language: "text",
				value: "hello world",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("required_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(requiredValidate).length(0);

	// Restricted languages
	const restrictedValidate = validateField({
		field: {
			key: "restricted_code",
			type: "code",
			value: {
				language: "javascript",
				value: "console.log(1);",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("restricted_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(restrictedValidate).length(0);
});

test("fail to validate field - code", async () => {
	// Standard - invalid shape
	const standardValidate = validateField({
		field: {
			key: "standard_code",
			type: "code",
			value: "invalid code value",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("standard_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_code",
			localeCode: null,
			message: copy.literal("Invalid input: expected object, received string"),
		},
	]);

	// Standard - missing value key
	const missingValueValidate = validateField({
		field: {
			key: "standard_code",
			type: "code",
			value: {
				language: "typescript",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("standard_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(missingValueValidate).toEqual([
		{
			key: "standard_code",
			localeCode: null,
			message: copy.literal(
				"Invalid input: expected string, received undefined → at value",
			),
		},
	]);

	// Required - undefined
	const requiredValidate = validateField({
		field: {
			key: "required_code",
			type: "code",
			value: undefined,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("required_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(requiredValidate).toEqual([
		{
			key: "required_code",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);

	// Required - empty code value normalizes to null
	const requiredEmptyValidate = validateField({
		field: {
			key: "required_code",
			type: "code",
			value: {
				language: "text",
				value: "   ",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("required_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(requiredEmptyValidate).toEqual([
		{
			key: "required_code",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);

	// Restricted languages - language not in list
	const restrictedValidate = validateField({
		field: {
			key: "restricted_code",
			type: "code",
			value: {
				language: "css",
				value: "body { color: red; }",
			},
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: CodeCollection.fields.get("restricted_code")!,
		validationData,
		meta: validationMeta,
	});
	expect(restrictedValidate).toEqual([
		{
			key: "restricted_code",
			localeCode: null,
			message: copy(
				"server:core.fields.code.validation.language.error.message",
				{
					data: {
						valid: "javascript, typescript",
					},
				},
			),
		},
	]);
});

// -----------------------------------------------
// Normalization
test("normalizes empty code values to null", async () => {
	const field = new CodeCustomField("field");

	expect(field.config.default).toBeNull();
	expect(field.normalizeInputValue("")).toBeNull();
	expect(field.normalizeInputValue("   ")).toBeNull();
	expect(field.normalizeInputValue({ language: "text", value: "" })).toBeNull();
	expect(
		field.normalizeInputValue({ language: "text", value: "   " }),
	).toBeNull();
	expect(
		field.normalizeInputValue({ language: "text", value: "hello" }),
	).toEqual({
		language: "text",
		value: "hello",
	});
});

// -----------------------------------------------
// Response formatting
test("formats code response values", async () => {
	const field = new CodeCustomField("field");
	expect(field.formatResponseValue(null)).toBeNull();
	expect(field.formatResponseValue(undefined)).toBeNull();
	expect(
		field.formatResponseValue({ language: "css", value: "body {}" }),
	).toEqual({
		language: "css",
		value: "body {}",
	});

	const fieldWithDefault = new CodeCustomField("field", {
		default: {
			language: "javascript",
			value: "console.log(1);",
		},
	});
	expect(fieldWithDefault.formatResponseValue(undefined)).toEqual({
		language: "javascript",
		value: "console.log(1);",
	});
});

// -----------------------------------------------
// AI generation
test("formats AI generated values into the code shape", async () => {
	const field = new CodeCustomField("field", {
		languages: ["javascript", "typescript"],
	});

	// object with a configured language passes through
	expect(
		field.formatAiGeneratedValue({
			language: "typescript",
			value: "const a = 1;",
		}),
	).toEqual({
		success: true,
		value: { language: "typescript", value: "const a = 1;" },
	});

	// unknown languages fall back to the first configured language
	expect(
		field.formatAiGeneratedValue({ language: "python", value: "print(1)" }),
	).toEqual({
		success: true,
		value: { language: "javascript", value: "print(1)" },
	});

	// serialized JSON output is parsed
	expect(
		field.formatAiGeneratedValue(
			JSON.stringify({ language: "javascript", value: "console.log(1);" }),
		),
	).toEqual({
		success: true,
		value: { language: "javascript", value: "console.log(1);" },
	});

	// raw code strings are wrapped with the fallback language
	expect(field.formatAiGeneratedValue("console.log(1);")).toEqual({
		success: true,
		value: { language: "javascript", value: "console.log(1);" },
	});
});

// -----------------------------------------------
// Storage
test("defines a nullable json column for storage", async () => {
	const field = new CodeCustomField("field");
	const res = field.getSchemaDefinition({
		db: {
			getDataType: () => "json",
		} as unknown as DatabaseAdapter,
		tables: {
			document: "document_table",
			version: "version_table",
		},
	});

	expect(res.error).toBeUndefined();
	expect(res.data?.columns).toEqual([
		{
			name: "field",
			type: "json",
			nullable: true,
			default: null,
		},
	]);
});

// -----------------------------------------------
// Client type generation
test("generates the code field client value type", async () => {
	const file = generateCollectionClientTypes({
		collections: [CodeCollection],
		localization: { locales: [{ code: "en" }] },
	});

	const fieldsDeclaration = file.declarations.find(
		(declaration) =>
			declaration.startsWith("export type Collection") &&
			declaration.includes("CollectionDocumentFields ="),
	);

	expect(fieldsDeclaration).toBeDefined();
	expect(fieldsDeclaration).toContain('"standard_code"');
	expect(fieldsDeclaration).toContain(
		"{ language: string; value: string } | null",
	);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new CodeCustomField("field", {
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
			language: "typescript",
			value: "const a = 1;",
		},
		languages: ["typescript", "javascript"],
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

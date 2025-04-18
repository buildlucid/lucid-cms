import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import WysiwygCustomField from "./wysiwyg.js";

// -----------------------------------------------
// Validation
const WysiwygCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addWysiwyg("standard_wysiwyg")
	.addWysiwyg("required_wysiwyg", {
		validation: {
			required: true,
		},
	})
	.addWysiwyg("min_length_wysiwyg", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - wysiwyg", async () => {
	// Standard
	const standardValidate = validateField(
		{
			key: "standard_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		WysiwygCollection.fields.get("standard_wysiwyg")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField(
		{
			key: "required_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		WysiwygCollection.fields.get("required_wysiwyg")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField(
		{
			key: "min_length_wysiwyg",
			type: "wysiwyg",
			value: "<h1>Heading</h1><p>Body</p>",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		WysiwygCollection.fields.get("min_length_wysiwyg")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(minLengthValidate).length(0);
});

test("fail to validate field - wysiwyg", async () => {
	// Standard
	const standardValidate = validateField(
		{
			key: "standard_wysiwyg",
			type: "wysiwyg",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		WysiwygCollection.fields.get("standard_wysiwyg")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(standardValidate).toEqual([
		{
			key: "standard_wysiwyg",
			message: "Expected string, received number", // zod error message
		},
	]);

	// Required
	const requiredValidate = {
		exists: validateField(
			{
				key: "required_wysiwyg",
				type: "wysiwyg",
				value: undefined,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			WysiwygCollection.fields.get("required_wysiwyg")!,
			{
				media: [],
				users: [],
				documents: [],
			},
		),
		null: validateField(
			{
				key: "required_wysiwyg",
				type: "wysiwyg",
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			WysiwygCollection.fields.get("required_wysiwyg")!,
			{
				media: [],
				users: [],
				documents: [],
			},
		),
	};
	expect(requiredValidate).toEqual({
		exists: [
			{
				key: "required_wysiwyg",
				message: T("generic_field_required"),
			},
		],
		null: [
			{
				key: "required_wysiwyg",
				message: T("generic_field_required"),
			},
		],
	});

	// Min length
	const minLengthValidate = validateField(
		{
			key: "min_length_wysiwyg",
			type: "wysiwyg",
			value: "Hi",
		},
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		WysiwygCollection.fields.get("min_length_wysiwyg")!,
		{
			media: [],
			users: [],
			documents: [],
		},
	);
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_wysiwyg",
			message: "String must contain at least 5 character(s)", // zod error message
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new WysiwygCustomField("field", {
		details: {
			label: {
				en: "title",
			},
			summary: {
				en: "description",
			},
			placeholder: {
				en: "placeholder",
			},
		},
		config: {
			useTranslations: true,
			default: "",
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			zod: z.string().min(5),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

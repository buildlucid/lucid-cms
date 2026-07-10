import { expect, test } from "vitest";
import z from "zod";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import TextCutomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const TextCollection = new CollectionBuilder("collection", {
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
	.addText("standard_text")
	.addText("required_text", {
		validation: {
			required: true,
		},
	})
	.addText("min_length_text", {
		validation: {
			zod: z.string().min(5),
		},
	});

test("successfully validate field - text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_text",
			type: "text",
			value: "Standard text",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextCollection.fields.get("standard_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: TextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).length(0);

	// Required
	const requiredValidate = validateField({
		field: {
			key: "required_text",
			type: "text",
			value: "Required text",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextCollection.fields.get("required_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: TextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(requiredValidate).length(0);

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_text",
			type: "text",
			value: "Min length text",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextCollection.fields.get("min_length_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: TextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).length(0);
});

test("fail to validate field - text", async () => {
	// Standard
	const standardValidate = validateField({
		field: {
			key: "standard_text",
			type: "text",
			value: 100,
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextCollection.fields.get("standard_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: TextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(standardValidate).toEqual([
		{
			key: "standard_text",
			localeCode: "en",
			message: copy.literal("Invalid input: expected string, received number"),
		},
	]);

	// Required
	const requiredValidate = {
		undefined: validateField({
			field: {
				key: "required_text",
				type: "text",
				value: undefined,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: TextCollection.fields.get("required_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: TextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
		null: validateField({
			field: {
				key: "required_text",
				type: "text",
				value: null,
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: TextCollection.fields.get("required_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: TextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
		empty: validateField({
			field: {
				key: "required_text",
				type: "text",
				value: "",
			},
			// biome-ignore lint/style/noNonNullAssertion: explanation
			instance: TextCollection.fields.get("required_text")!,
			validationData: {
				media: [],
				user: [],
				relation: [],
			},
			meta: {
				localized: TextCollection.getData.localized,
				defaultLocale: "en",
			},
		}),
	};
	expect(requiredValidate).toEqual({
		undefined: [
			{
				key: "required_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
		null: [
			{
				key: "required_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
		empty: [
			{
				key: "required_text",
				localeCode: "en",
				message: copy("server:core.fields.validation.required"),
			},
		],
	});

	// Min length
	const minLengthValidate = validateField({
		field: {
			key: "min_length_text",
			type: "text",
			value: "1",
		},
		// biome-ignore lint/style/noNonNullAssertion: explanation
		instance: TextCollection.fields.get("min_length_text")!,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: TextCollection.getData.localized,
			defaultLocale: "en",
		},
	});
	expect(minLengthValidate).toEqual([
		{
			key: "min_length_text",
			localeCode: "en",
			message: copy.literal(
				"Too small: expected string to have >=5 characters",
			),
		},
	]);
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TextCutomField("field", {
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
		default: "",
		index: true,
		ui: {
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
			zod: z.string().min(5),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

test("custom field config rejects index false", async () => {
	const res = await CustomFieldSchema.safeParseAsync({
		type: "text",
		key: "field",
		index: false,
	});

	expect(res.success).toBe(false);
});

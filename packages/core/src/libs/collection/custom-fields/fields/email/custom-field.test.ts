import { expect, test } from "vitest";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import { getFieldBuilderState } from "../../../builders/field-builder/index.js";
import CustomFieldSchema from "../../schema.js";
import EmailCustomField from "./custom-field.js";

// -----------------------------------------------
// Validation
const EmailCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:tests.collections.collection.singularName", {
				defaultMessage: "Test",
			}),
			plural: copy("admin:tests.collections.collection.name", {
				defaultMessage: "Test",
			}),
		},
	},
	localized: true,
})
	.addEmail("required_email", {
		validation: {
			required: true,
		},
	})
	.addEmail("multi_email", {
		multiple: true,
		validation: {
			maxItems: 2,
		},
	})
	.addEmail("internal_email", {
		allowInternal: true,
	});

const getInstance = (key: string) => {
	const instance = getFieldBuilderState(EmailCollection).fields.get(key);
	if (!instance) throw new Error(`Missing test field ${key}`);
	return instance;
};
const meta = {
	localized: EmailCollection.getData.localized,
	defaultLocale: "en",
};

test("email field accepts emails that exist and requires one when required", () => {
	expect(
		validateField({
			field: { key: "required_email", type: "email", value: [1] },
			instance: getInstance("required_email"),
			validationData: { email: [{ id: 1, type: "external" }] },
			meta,
		}),
	).toEqual([]);
	expect(
		validateField({
			field: { key: "required_email", type: "email", value: [] },
			instance: getInstance("required_email"),
			validationData: { email: [] },
			meta,
		}),
	).toEqual([
		{
			key: "required_email",
			localeCode: null,
			message: copy("server:core.fields.validation.required"),
		},
	]);
});

test("email field reports each missing email by index", () => {
	expect(
		validateField({
			field: { key: "multi_email", type: "email", value: [1, 99] },
			instance: getInstance("multi_email"),
			validationData: { email: [{ id: 1, type: "external" }] },
			meta,
		}),
	).toEqual([
		{
			key: "multi_email",
			localeCode: null,
			message: copy("server:core.fields.email.validation.not.found"),
			itemIndex: 1,
		},
	]);
	expect(
		validateField({
			field: { key: "multi_email", type: "email", value: [1, 2, 3] },
			instance: getInstance("multi_email"),
			validationData: {
				email: [
					{ id: 1, type: "external" },
					{ id: 2, type: "external" },
					{ id: 3, type: "external" },
				],
			},
			meta,
		}),
	).toEqual([
		{
			key: "multi_email",
			localeCode: null,
			message: copy("server:core.fields.relation.validation.max.items", {
				data: {
					max: 2,
				},
			}),
		},
	]);
});

test("email field only accepts internal emails when allowInternal is set", () => {
	const internalEmail = { id: 5, type: "internal" };

	expect(
		validateField({
			field: { key: "required_email", type: "email", value: [5] },
			instance: getInstance("required_email"),
			validationData: { email: [internalEmail] },
			meta,
		}),
	).toEqual([
		{
			key: "required_email",
			localeCode: null,
			message: copy("server:core.fields.email.validation.not.found"),
			itemIndex: 0,
		},
	]);
	expect(
		validateField({
			field: { key: "internal_email", type: "email", value: [5] },
			instance: getInstance("internal_email"),
			validationData: { email: [internalEmail] },
			meta,
		}),
	).toEqual([]);
});

// -----------------------------------------------
// Custom field config
test("email field config passes schema validation", async () => {
	const field = new EmailCustomField("field", {
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "title",
			}),
		},
		localized: true,
		validation: {
			required: true,
		},
	});
	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

test("multiple config controls how many email IDs are kept", () => {
	const singleField = new EmailCustomField("single_email");
	const multipleField = new EmailCustomField("multiple_email", {
		multiple: true,
	});

	expect(singleField.defaultValue).toEqual([]);
	expect(singleField.normalizeInputValue([1, 2, 3])).toEqual([1]);
	expect(singleField.formatResponseValue([1, 2, 3])).toEqual([1]);
	expect(multipleField.formatResponseValue([1, 2, 3])).toEqual([1, 2, 3]);
});

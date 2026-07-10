import { describe, expect, test } from "vitest";
import z from "zod";
import { validateField } from "../../../../../services/documents-bricks/checks/check-validate-bricks-fields.js";
import type DatabaseAdapter from "../../../../db/adapter-base.js";
import { copy } from "../../../../i18n/index.js";
import CollectionBuilder from "../../../builders/collection-builder/index.js";
import generateCollectionClientTypes from "../../../type-gen/index.js";
import CustomFieldSchema from "../../schema.js";
import { formatNumberFilterValue } from "../../utils/filter-values.js";
import RangeCustomField from "./custom-field.js";

const RangeCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: copy("admin:tests.collections.collection.name", {
			defaultMessage: "Test",
		}),
		singularName: copy("admin:tests.collections.collection.singularName", {
			defaultMessage: "Test",
		}),
	},
})
	.addRange("standard_range", {
		min: -10,
		max: 10,
		step: 0.5,
	})
	.addRange("dual_range", {
		min: 0,
		max: 10,
		step: 0.25,
		thumbs: 2,
	})
	.addRange("required_range", {
		validation: { required: true },
	})
	.addRange("zod_range", {
		validation: { zod: z.array(z.number()).refine(([value]) => value === 5) },
	});

const validate = (key: string, value: unknown) => {
	const instance = RangeCollection.fields.get(key);
	if (!instance) throw new Error(`Missing test field ${key}`);

	return validateField({
		field: {
			key,
			type: "range",
			value,
		},
		instance,
		validationData: {
			media: [],
			user: [],
			relation: [],
		},
		meta: {
			localized: RangeCollection.getData.localized,
			defaultLocale: "en",
		},
	});
};

describe("range validation", () => {
	test("accepts single and dual decimal values", () => {
		expect(validate("standard_range", [1.5])).toHaveLength(0);
		expect(validate("dual_range", [2.25, 8.5])).toHaveLength(0);
		expect(validate("zod_range", [5])).toHaveLength(0);
	});

	test("rejects invalid shapes, bounds, steps and required values", () => {
		expect(validate("standard_range", 1)).toHaveLength(1);
		expect(validate("standard_range", [10.5])).toHaveLength(1);
		expect(validate("standard_range", [1.25])).toHaveLength(1);
		expect(validate("dual_range", [5])).toHaveLength(1);
		expect(validate("required_range", [])).toEqual([
			{
				key: "required_range",
				localeCode: null,
				message: copy("server:core.fields.validation.required"),
			},
		]);
		expect(validate("zod_range", [4])).toHaveLength(1);
	});
});

test("range config passes schema validation", async () => {
	const field = new RangeCustomField("field", {
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "Range",
			}),
			summary: copy("admin:tests.fields.field.summary", {
				defaultMessage: "Pick a range",
			}),
		},
		min: -2.5,
		max: 7.5,
		step: 0.25,
		thumbs: 2,
		default: [-1.5, 4.25],
		localized: true,
		index: true,
		ui: {
			hidden: false,
			disabled: false,
			width: 6,
		},
		validation: {
			required: true,
			zod: z.array(z.number()),
		},
	});

	const result = await CustomFieldSchema.safeParseAsync(field.config);
	expect(result.success).toBe(true);
});

test("range config rejects invalid bounds and steps", async () => {
	const invalidBounds = new RangeCustomField("field", { min: 10, max: 5 });
	const invalidStep = new RangeCustomField("field", { step: 0 });
	const invalidDefault = new RangeCustomField("field", {
		min: 0,
		max: 10,
		step: 0.5,
		default: [10.25],
	});

	expect(
		(await CustomFieldSchema.safeParseAsync(invalidBounds.config)).success,
	).toBe(false);
	expect(
		(await CustomFieldSchema.safeParseAsync(invalidStep.config)).success,
	).toBe(false);
	expect(
		(await CustomFieldSchema.safeParseAsync(invalidDefault.config)).success,
	).toBe(false);
});

test("normalizes, serializes and formats range values", () => {
	const single = new RangeCustomField("single", { default: [3] });
	const dual = new RangeCustomField("dual", {
		thumbs: 2,
		default: [2, 8],
	});

	expect(single.normalizeInputValue([7, 2])).toEqual([7]);
	expect(dual.normalizeInputValue([8, 2, 6])).toEqual([2, 8]);
	expect(dual.serializeRelationFieldValue([8.5, 2.25])).toEqual([
		{ _value: 2.25 },
		{ _value: 8.5 },
	]);
	expect(dual.formatResponseValue([8.5, 2.25])).toEqual([2.25, 8.5]);
	expect(dual.formatResponseValue([])).toEqual([2, 8]);
});

test("defines a real-valued relation-table column", () => {
	const field = new RangeCustomField("field");
	const result = field.getSchemaDefinition({
		db: {
			getDataType: (type: string) => type,
		} as unknown as DatabaseAdapter,
		tables: {
			document: "document_table",
			version: "version_table",
		},
	});

	expect(result.error).toBeUndefined();
	expect(result.data?.columns).toEqual([
		{
			name: "value",
			type: "real",
			nullable: false,
		},
	]);
});

test("formats decimal filter values", () => {
	expect(
		formatNumberFilterValue({
			value: "2.75",
			column: {
				name: "_value",
				source: "field",
				type: "real",
			},
		}),
	).toBe(2.75);
	expect(
		formatNumberFilterValue({
			value: "invalid",
			column: {
				name: "_value",
				source: "field",
				type: "real",
			},
		}),
	).toBeNull();
});

test("generates a number array client value type", () => {
	const file = generateCollectionClientTypes({
		collections: [RangeCollection],
		localization: { locales: [{ code: "en" }] },
	});
	const fieldsDeclaration = file.declarations?.find(
		(declaration) =>
			declaration.startsWith("export type Collection") &&
			declaration.includes("CollectionDocumentFields ="),
	);
	const filtersDeclaration = file.declarations?.find((declaration) =>
		declaration.includes("CollectionDocumentFilters ="),
	);

	expect(fieldsDeclaration).toBeDefined();
	expect(fieldsDeclaration).toContain('"standard_range"');
	expect(fieldsDeclaration).toContain("number[]");
	expect(filtersDeclaration).toContain('"_standard_range"');
});

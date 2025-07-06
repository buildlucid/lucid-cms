import { describe, it, expect, vi } from "vitest";
import groupDocumentFilters from "./group-document-filters.js";
import type { QueryParamFilters } from "../../types/query-params.js";
import type { LucidBrickTableName } from "../../types.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";

// Mock the prefixGeneratedColName function
vi.mock(
	"../src/services/collection-migrator/helpers/prefix-generated-column-name",
	() => ({
		default: (key: string) => `_${key}`,
	}),
);

describe("groupDocumentFilters", () => {
	// Sample schema that matches the provided example
	const sampleSchema: CollectionSchemaTable<LucidBrickTableName>[] = [
		{
			name: "lucid_document__simple__simple",
			type: "brick",
			key: { collection: "simple", brick: "simple", repeater: undefined },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_heading",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
				{
					name: "_image",
					source: "field",
					type: "integer",
					nullable: true,
					customField: { type: "media" },
				},
				{
					name: "_document",
					source: "field",
					type: "integer",
					nullable: true,
					customField: { type: "document" },
				},
			],
		},
		{
			name: "lucid_document__simple__simple__items",
			type: "repeater",
			key: { collection: "simple", brick: "simple", repeater: ["items"] },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_itemTitle",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
			],
		},
		{
			name: "lucid_document__simple__simple__items__nestedItems",
			type: "repeater",
			key: {
				collection: "simple",
				brick: "simple",
				repeater: ["items", "nestedItems"],
			},
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_nestedItemTitle",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
				{
					name: "_nestedCheckbox",
					source: "field",
					type: "integer",
					nullable: true,
					customField: { type: "checkbox" },
				},
			],
		},
		{
			name: "lucid_document__simple__simple-fixed",
			type: "brick",
			key: { collection: "simple", brick: "simple-fixed", repeater: undefined },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_heading",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
			],
		},
		{
			name: "lucid_document__simple__fields",
			type: "document-fields",
			key: { collection: "simple", brick: undefined, repeater: undefined },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_simpleHeading",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
			],
		},
		{
			name: "lucid_document__simple__fields__people",
			type: "repeater",
			key: { collection: "simple", brick: undefined, repeater: ["people"] },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_firstName",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
			],
		},
	];

	it("should return empty filters if no filters are provided", () => {
		const result = groupDocumentFilters(sampleSchema);
		expect(result).toEqual({
			documentFilters: {},
			brickFilters: [],
		});
	});

	it("should handle document core filters", () => {
		const filters: QueryParamFilters = {
			id: { value: 1 },
			createdBy: { value: 2 },
			updatedAt: { value: "2023-01-01", operator: ">=" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({
			id: { value: 1 },
			createdBy: { value: 2 },
			updatedAt: { value: "2023-01-01", operator: ">=" },
		});
		expect(result.brickFilters).toHaveLength(0);
	});

	it("should handle document custom fields with _ prefix", () => {
		const filters: QueryParamFilters = {
			_simpleHeading: { value: "Test Heading" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe("lucid_document__simple__fields");
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "simpleHeading",
				value: "Test Heading",
				operator: "=",
				column: "_simpleHeading",
			},
		]);
	});

	it('should handle document fields accessed with "fields." prefix', () => {
		const filters: QueryParamFilters = {
			"fields._simpleHeading": { value: "Test Heading" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe("lucid_document__simple__fields");
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "simpleHeading",
				value: "Test Heading",
				operator: "=",
				column: "_simpleHeading",
			},
		]);
	});

	it('should handle brick fields with "brickKey._fieldKey" syntax', () => {
		const filters: QueryParamFilters = {
			"simple._heading": { value: "Brick Heading" },
			"simple._image": { value: 5, operator: "!=" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe("lucid_document__simple__simple");
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "heading",
				value: "Brick Heading",
				operator: "=",
				column: "_heading",
			},
			{
				key: "image",
				value: 5,
				operator: "!=",
				column: "_image",
			},
		]);
	});

	it('should handle repeater fields with "brickKey.repeaterKey._fieldKey" syntax', () => {
		const filters: QueryParamFilters = {
			"simple.items._itemTitle": { value: "Item Title", operator: "like" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe(
			"lucid_document__simple__simple__items",
		);
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "itemTitle",
				value: "Item Title",
				operator: "like",
				column: "_itemTitle",
			},
		]);
	});

	it("should handle nested repeater fields by finding matching repeater key", () => {
		const filters: QueryParamFilters = {
			"simple.nestedItems._nestedItemTitle": { value: "Nested Title" },
			"simple.nestedItems._nestedCheckbox": { value: 1 },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe(
			"lucid_document__simple__simple__items__nestedItems",
		);
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "nestedItemTitle",
				value: "Nested Title",
				operator: "=",
				column: "_nestedItemTitle",
			},
			{
				key: "nestedCheckbox",
				value: 1,
				operator: "=",
				column: "_nestedCheckbox",
			},
		]);
	});

	it('should handle document field repeaters with "fields.repeaterKey._fieldKey" syntax', () => {
		const filters: QueryParamFilters = {
			"fields.people._firstName": { value: "John", operator: "like" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe(
			"lucid_document__simple__fields__people",
		);
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "firstName",
				value: "John",
				operator: "like",
				column: "_firstName",
			},
		]);
	});

	it("should handle mixed filter types together", () => {
		const filters: QueryParamFilters = {
			id: { value: 1 },
			_simpleHeading: { value: "Document Heading" },
			"simple._heading": { value: "Brick Heading" },
			"simple.items._itemTitle": { value: "Item Title" },
			"fields.people._firstName": { value: "John" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({
			id: { value: 1 },
		});

		expect(result.brickFilters).toHaveLength(4);

		// Find each filter by table name
		const docFieldsFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__fields",
		);
		const brickFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__simple",
		);
		const repeaterFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__simple__items",
		);
		const docRepeaterFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__fields__people",
		);

		expect(docFieldsFilter).toBeDefined();
		expect(docFieldsFilter?.filters).toEqual([
			{
				key: "simpleHeading",
				value: "Document Heading",
				operator: "=",
				column: "_simpleHeading",
			},
		]);

		expect(brickFilter).toBeDefined();
		expect(brickFilter?.filters).toEqual([
			{
				key: "heading",
				value: "Brick Heading",
				operator: "=",
				column: "_heading",
			},
		]);

		expect(repeaterFilter).toBeDefined();
		expect(repeaterFilter?.filters).toEqual([
			{
				key: "itemTitle",
				value: "Item Title",
				operator: "=",
				column: "_itemTitle",
			},
		]);

		expect(docRepeaterFilter).toBeDefined();
		expect(docRepeaterFilter?.filters).toEqual([
			{
				key: "firstName",
				value: "John",
				operator: "=",
				column: "_firstName",
			},
		]);
	});

	it("should ignore filters for non-existent fields or tables", () => {
		const filters: QueryParamFilters = {
			"nonExistent._field": { value: "Test" },
			"simple._nonExistentField": { value: "Test" },
			"simple.nonExistentRepeater._field": { value: "Test" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(0);
	});
});

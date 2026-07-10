import { describe, expect, it, vi } from "vitest";
import constants from "../../constants/constants.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type {
	QueryParamFilterCondition,
	QueryParamFilters,
} from "../../types/query-params.js";
import type { LucidBrickTableName } from "../../types.js";
import groupDocumentFilters, {
	groupDocumentFilterConditions,
} from "./group-document-filters.js";

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
			rawName: "lucid_document__simple__simple",
			type: "brick",
			key: { collection: "simple", brick: "simple", fieldPath: undefined },
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
					customField: { type: "relation" },
				},
			],
		},
		{
			name: "lucid_document__simple__simple__items",
			rawName: "lucid_document__simple__simple__items",
			type: `${constants.db.customFieldTablePrefix}repeater`,
			key: { collection: "simple", brick: "simple", fieldPath: ["items"] },
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
			rawName: "lucid_document__simple__simple__items__nestedItems",
			type: `${constants.db.customFieldTablePrefix}repeater`,
			key: {
				collection: "simple",
				brick: "simple",
				fieldPath: ["items", "nestedItems"],
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
			rawName: "lucid_document__simple__simple-fixed",
			type: "brick",
			key: {
				collection: "simple",
				brick: "simple-fixed",
				fieldPath: undefined,
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
					name: "_heading",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text" },
				},
			],
		},
		{
			name: "lucid_document__simple__fld",
			rawName: "lucid_document__simple__fld",
			type: "document-fields",
			key: { collection: "simple", brick: undefined, fieldPath: undefined },
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
				{
					name: "_simpleNumber",
					source: "field",
					type: "integer",
					nullable: true,
					customField: { type: "number" },
				},
				{
					name: "_simpleCheckbox",
					source: "field",
					type: "boolean",
					nullable: true,
					customField: { type: "checkbox" },
				},
				{
					name: "_simpleSelect",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "select" },
				},
				{
					name: "_simpleTextarea",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "textarea" },
				},
				{
					name: "_simpleColor",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "color" },
				},
				{
					name: "_simpleDate",
					source: "field",
					type: "timestamp",
					nullable: true,
					customField: { type: "datetime" },
				},
				{
					name: "_simpleJson",
					source: "field",
					type: "json",
					nullable: true,
					customField: { type: "json" },
				},
				{
					name: "_simpleCode",
					source: "field",
					type: "json",
					nullable: true,
					customField: { type: "code" },
				},
				{
					name: "_simpleLink",
					source: "field",
					type: "json",
					nullable: true,
					customField: { type: "link" },
				},
				{
					name: "_simpleRichText",
					source: "field",
					type: "json",
					nullable: true,
					customField: { type: "rich-text" },
				},
			],
		},
		{
			name: "lucid_document__simple__fld__author",
			rawName: "lucid_document__simple__fld__author",
			type: `${constants.db.customFieldTablePrefix}user`,
			key: { collection: "simple", brick: undefined, fieldPath: ["author"] },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_document_id",
					source: "core",
					type: "integer",
					nullable: false,
				},
				{
					name: "document_version_id",
					source: "core",
					type: "integer",
					nullable: false,
				},
				{
					name: "_user_id",
					source: "field",
					type: "integer",
					nullable: false,
					customField: { type: "user" },
				},
			],
		},
		{
			name: "lucid_document__simple__fld__heroImage",
			rawName: "lucid_document__simple__fld__heroImage",
			type: `${constants.db.customFieldTablePrefix}media`,
			key: {
				collection: "simple",
				brick: undefined,
				fieldPath: ["heroImage"],
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
					name: "_document_id",
					source: "core",
					type: "integer",
					nullable: false,
				},
				{
					name: "_media_id",
					source: "field",
					type: "integer",
					nullable: false,
					customField: { type: "media" },
				},
			],
		},
		{
			name: "lucid_document__simple__fld__rel__relatedDocument",
			rawName: "lucid_document__simple__fld__rel__relatedDocument",
			type: `${constants.db.customFieldTablePrefix}relation`,
			key: {
				collection: "simple",
				brick: undefined,
				fieldPath: ["relatedDocument"],
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
					name: "_document_id",
					source: "core",
					type: "integer",
					nullable: false,
				},
				{
					name: "_collection_key",
					source: "field",
					type: "text",
					nullable: false,
					customField: { type: "relation" },
				},
				{
					name: "_document_id",
					source: "field",
					type: "integer",
					nullable: false,
					customField: { type: "relation" },
				},
			],
		},
		{
			name: "lucid_document__simple__simple__reviewer",
			rawName: "lucid_document__simple__simple__reviewer",
			type: `${constants.db.customFieldTablePrefix}user`,
			key: {
				collection: "simple",
				brick: "simple",
				fieldPath: ["reviewer"],
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
					name: "_document_id",
					source: "core",
					type: "integer",
					nullable: false,
				},
				{
					name: "_user_id",
					source: "field",
					type: "integer",
					nullable: false,
					customField: { type: "user" },
				},
			],
		},
		{
			name: "lucid_document__simple__fld__rng__priceRange",
			rawName: "lucid_document__simple__fld__rng__priceRange",
			type: `${constants.db.customFieldTablePrefix}range`,
			key: {
				collection: "simple",
				brick: undefined,
				fieldPath: ["priceRange"],
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
					name: "_value",
					source: "field",
					type: "real",
					nullable: false,
					customField: { type: "range" },
				},
			],
		},
		{
			name: "lucid_document__simple__fld__people",
			rawName: "lucid_document__simple__fld__people",
			type: `${constants.db.customFieldTablePrefix}repeater`,
			key: { collection: "simple", brick: undefined, fieldPath: ["people"] },
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

	it("should only handle workflow filters when enabled", () => {
		const filters: QueryParamFilters = {
			workflowStage: { value: "done" },
			workflowAssignee: { value: ["1", "2"] },
		};

		expect(groupDocumentFilters(sampleSchema, filters)).toEqual({
			documentFilters: {},
			brickFilters: [],
		});

		expect(
			groupDocumentFilters(sampleSchema, filters, {
				includeWorkflow: true,
			}).documentFilters,
		).toEqual(filters);
	});

	it("should handle relation custom fields with _ prefix", () => {
		const filters: QueryParamFilters = {
			_simpleHeading: { value: "Test Heading" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe("lucid_document__simple__fld");
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
		expect(result.brickFilters[0].table).toBe("lucid_document__simple__fld");
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "simpleHeading",
				value: "Test Heading",
				operator: "=",
				column: "_simpleHeading",
			},
		]);
	});

	it("should format column custom field filter values by field type", () => {
		const filters: QueryParamFilters = {
			_simpleHeading: { value: "Test Heading" },
			_simpleNumber: { value: ["42", "not-a-number"] },
			_simpleCheckbox: { value: ["true", "false", "maybe"] },
			_simpleSelect: { value: "published" },
			_simpleTextarea: { value: "Long text" },
			_simpleColor: { value: "#ffffff" },
			_simpleDate: { value: "2024-01-01T00:00:00.000Z" },
			_simpleJson: { value: '{"ok":true}' },
			_simpleCode: { value: '{"language":"ts","value":"const a = 1;"}' },
			_simpleLink: { value: '{"url":"https://example.com"}' },
			_simpleRichText: { value: '{"type":"doc","content":[]}' },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld",
				filters: [
					{
						key: "simpleHeading",
						value: "Test Heading",
						operator: "=",
						column: "_simpleHeading",
					},
					{
						key: "simpleNumber",
						value: [42, null],
						operator: "in",
						column: "_simpleNumber",
					},
					{
						key: "simpleCheckbox",
						value: [true, false, null],
						operator: "in",
						column: "_simpleCheckbox",
					},
					{
						key: "simpleSelect",
						value: "published",
						operator: "=",
						column: "_simpleSelect",
					},
					{
						key: "simpleTextarea",
						value: "Long text",
						operator: "=",
						column: "_simpleTextarea",
					},
					{
						key: "simpleColor",
						value: "#ffffff",
						operator: "=",
						column: "_simpleColor",
					},
					{
						key: "simpleDate",
						value: "2024-01-01T00:00:00.000Z",
						operator: "=",
						column: "_simpleDate",
					},
					{
						key: "simpleJson",
						value: '{"ok":true}',
						operator: "=",
						column: "_simpleJson",
					},
					{
						key: "simpleCode",
						value: '{"language":"ts","value":"const a = 1;"}',
						operator: "=",
						column: "_simpleCode",
					},
					{
						key: "simpleLink",
						value: '{"url":"https://example.com"}',
						operator: "=",
						column: "_simpleLink",
					},
					{
						key: "simpleRichText",
						value: '{"type":"doc","content":[]}',
						operator: "=",
						column: "_simpleRichText",
					},
				],
			},
		]);
	});

	it("should handle relation custom fields stored in generated relation tables", () => {
		const filters: QueryParamFilters = {
			_author: { value: [1, 2] },
			_heroImage: { value: 10 },
			_relatedDocument: { value: 5 },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__author",
				filters: [
					{
						key: "author",
						value: [1, 2],
						operator: "in",
						column: "_user_id",
					},
				],
			},
			{
				table: "lucid_document__simple__fld__heroImage",
				filters: [
					{
						key: "heroImage",
						value: 10,
						operator: "=",
						column: "_media_id",
					},
				],
			},
			{
				table: "lucid_document__simple__fld__rel__relatedDocument",
				filters: [
					{
						key: "relatedDocument",
						value: 5,
						operator: "=",
						column: "_document_id",
					},
				],
			},
		]);
	});

	it("should format generated relation table filter values by field type", () => {
		const filters: QueryParamFilters = {
			_author: { value: ["1", "not-a-number"] },
			_heroImage: { value: "10" },
			_relatedDocument: { value: "5" },
			"simple._reviewer": { value: "3" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__author",
				filters: [
					{
						key: "author",
						value: [1, null],
						operator: "in",
						column: "_user_id",
					},
				],
			},
			{
				table: "lucid_document__simple__fld__heroImage",
				filters: [
					{
						key: "heroImage",
						value: 10,
						operator: "=",
						column: "_media_id",
					},
				],
			},
			{
				table: "lucid_document__simple__fld__rel__relatedDocument",
				filters: [
					{
						key: "relatedDocument",
						value: 5,
						operator: "=",
						column: "_document_id",
					},
				],
			},
			{
				table: "lucid_document__simple__simple__reviewer",
				filters: [
					{
						key: "reviewer",
						value: 3,
						operator: "=",
						column: "_user_id",
					},
				],
			},
		]);
	});

	it("should filter decimal range values through their generated value table", () => {
		const filters: QueryParamFilters = {
			_priceRange: { value: "20.5", operator: ">=" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__rng__priceRange",
				filters: [
					{
						key: "priceRange",
						value: 20.5,
						operator: ">=",
						column: "_value",
					},
				],
			},
		]);
	});

	it("should split compound collectionKey:id relation values into same-table conditions", () => {
		const filters: QueryParamFilters = {
			_relatedDocument: { value: "pages:7" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__rel__relatedDocument",
				filters: [
					{
						key: "relatedDocument",
						value: "pages",
						operator: "=",
						column: "_collection_key",
					},
					{
						key: "relatedDocument",
						value: 7,
						operator: "=",
						column: "_document_id",
					},
				],
			},
		]);
	});

	it("should keep the filter operator on the document id for compound relation values", () => {
		const filters: QueryParamFilters = {
			_relatedDocument: { value: "articles:12", operator: "!=" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__rel__relatedDocument",
				filters: [
					{
						key: "relatedDocument",
						value: "articles",
						operator: "=",
						column: "_collection_key",
					},
					{
						key: "relatedDocument",
						value: 12,
						operator: "!=",
						column: "_document_id",
					},
				],
			},
		]);
	});

	it("should not split compound values for relation tables without a collection key column", () => {
		const filters: QueryParamFilters = {
			_author: { value: "pages:7" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		//* user tables have no _collection_key - value falls through and the
		//* integer formatter nulls it so the filter matches no rows
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__author",
				filters: [
					{
						key: "author",
						value: null,
						operator: "=",
						column: "_user_id",
					},
				],
			},
		]);
	});

	it("should not treat non-matching strings as compound relation values", () => {
		const filters: QueryParamFilters = {
			_relatedDocument: { value: "Pages:7" },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		//* invalid collection key casing - falls back to the plain id filter,
		//* where integer coercion nulls the value
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld__rel__relatedDocument",
				filters: [
					{
						key: "relatedDocument",
						value: null,
						operator: "=",
						column: "_document_id",
					},
				],
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

	it("should handle brick custom fields stored in generated relation tables", () => {
		const filters: QueryParamFilters = {
			"simple._reviewer": { value: 3 },
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__simple__reviewer",
				filters: [
					{
						key: "reviewer",
						value: 3,
						operator: "=",
						column: "_user_id",
					},
				],
			},
		]);
	});

	it('should handle repeater fields with "brickKey.repeaterKey._fieldKey" syntax', () => {
		const filters: QueryParamFilters = {
			"simple.items._itemTitle": {
				value: "Item Title",
				operator: "contains",
			},
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
				operator: "contains",
				column: "_itemTitle",
			},
		]);
	});

	it("should handle nested repeater fields by finding matching repeater key", () => {
		const filters: QueryParamFilters = {
			"simple.nestedItems._nestedItemTitle": { value: "Nested Title" },
			"simple.nestedItems._nestedCheckbox": { value: "true" },
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
			"fields.people._firstName": {
				value: "John",
				operator: "starts-with",
			},
		};

		const result = groupDocumentFilters(sampleSchema, filters);

		expect(result.documentFilters).toEqual({});
		expect(result.brickFilters).toHaveLength(1);
		expect(result.brickFilters[0].table).toBe(
			"lucid_document__simple__fld__people",
		);
		expect(result.brickFilters[0].filters).toEqual([
			{
				key: "firstName",
				value: "John",
				operator: "starts-with",
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
			(f) => f.table === "lucid_document__simple__fld",
		);
		const brickFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__simple",
		);
		const repeaterFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__simple__items",
		);
		const docRepeaterFilter = result.brickFilters.find(
			(f) => f.table === "lucid_document__simple__fld__people",
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

	it("groups condition arrays for OR document filtering", () => {
		const filters: QueryParamFilterCondition[] = [
			{ key: "id", value: 1 },
			{
				key: "_simpleHeading",
				value: "Document Heading",
				operator: "contains",
			},
			{ key: "simple._heading", value: "Brick Heading" },
		];

		const result = groupDocumentFilterConditions(sampleSchema, filters);

		expect(result.documentFilters).toEqual([{ key: "id", value: 1 }]);
		expect(result.brickFilters).toEqual([
			{
				table: "lucid_document__simple__fld",
				filters: [
					{
						key: "simpleHeading",
						value: "Document Heading",
						operator: "contains",
						column: "_simpleHeading",
					},
				],
			},
			{
				table: "lucid_document__simple__simple",
				filters: [
					{
						key: "heading",
						value: "Brick Heading",
						operator: "=",
						column: "_heading",
					},
				],
			},
		]);
	});
});

import { describe, expect, it } from "vitest";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../libs/db/tables/index.js";
import resolveCustomFieldSorts from "./resolve-custom-field-sorts.js";

describe("resolveCustomFieldSorts", () => {
	const documentFieldsTableSchema: CollectionSchemaTable<LucidBrickTableName> =
		{
			name: "lucid_document__pages__fields",
			rawName: "lucid_document__pages__fields",
			type: "document-fields",
			key: { collection: "pages" },
			columns: [
				{
					name: "id",
					source: "core",
					type: "integer",
					nullable: false,
					primary: true,
				},
				{
					name: "_title",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "text", localized: true },
				},
				{
					name: "_summary",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "textarea" },
				},
				{
					name: "_views",
					source: "field",
					type: "integer",
					nullable: true,
					customField: { type: "number" },
				},
				{
					name: "_publishedAt",
					source: "field",
					type: "timestamp",
					nullable: true,
					customField: { type: "datetime" },
				},
				{
					name: "_category",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "select" },
				},
				{
					name: "_featured",
					source: "field",
					type: "boolean",
					nullable: true,
					customField: { type: "checkbox" },
				},
				{
					name: "_accent",
					source: "field",
					type: "text",
					nullable: true,
					customField: { type: "color" },
				},
			],
		};

	it("resolves sorts for supported top-level custom fields", () => {
		const result = resolveCustomFieldSorts(documentFieldsTableSchema, [
			{ key: "fields.title", direction: "asc" },
			{ key: "fields.summary", direction: "desc" },
			{ key: "fields.views", direction: "asc" },
			{ key: "fields.publishedAt", direction: "desc" },
			{ key: "fields.category", direction: "asc" },
			{ key: "fields.featured", direction: "desc" },
		]);

		expect(result).toEqual([
			{ key: "fields.title", column: "_title", localized: true },
			{ key: "fields.summary", column: "_summary", localized: false },
			{ key: "fields.views", column: "_views", localized: false },
			{ key: "fields.publishedAt", column: "_publishedAt", localized: false },
			{ key: "fields.category", column: "_category", localized: false },
			{ key: "fields.featured", column: "_featured", localized: false },
		]);
	});

	it("ignores core document sort keys", () => {
		const result = resolveCustomFieldSorts(documentFieldsTableSchema, [
			{ key: "createdAt", direction: "asc" },
			{ key: "updatedAt", direction: "desc" },
			{ key: "order", direction: "asc" },
		]);

		expect(result).toEqual([]);
	});

	it("ignores custom field sort keys that have no matching column", () => {
		const result = resolveCustomFieldSorts(documentFieldsTableSchema, [
			{ key: "fields.missing", direction: "asc" },
		]);

		expect(result).toEqual([]);
	});

	it("ignores custom fields whose type does not support sorting", () => {
		const result = resolveCustomFieldSorts(documentFieldsTableSchema, [
			{ key: "fields.accent", direction: "asc" },
		]);

		expect(result).toEqual([]);
	});

	it("returns nothing when the sort or schema is missing", () => {
		expect(resolveCustomFieldSorts(documentFieldsTableSchema)).toEqual([]);
		expect(
			resolveCustomFieldSorts(undefined, [
				{ key: "fields.title", direction: "asc" },
			]),
		).toEqual([]);
	});
});

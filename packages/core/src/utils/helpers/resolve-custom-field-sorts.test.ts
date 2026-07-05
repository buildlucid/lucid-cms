import { describe, expect, it } from "vitest";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../types.js";
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
					customField: { type: "text" },
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
			],
		};

	it("resolves sorts for supported top-level custom fields", () => {
		const result = resolveCustomFieldSorts(documentFieldsTableSchema, [
			{ key: "_title", direction: "asc" },
			{ key: "_summary", direction: "desc" },
			{ key: "_views", direction: "asc" },
			{ key: "_publishedAt", direction: "desc" },
			{ key: "_category", direction: "asc" },
		]);

		expect(result).toEqual([
			{ key: "_title", column: "_title" },
			{ key: "_summary", column: "_summary" },
			{ key: "_views", column: "_views" },
			{ key: "_publishedAt", column: "_publishedAt" },
			{ key: "_category", column: "_category" },
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
			{ key: "_missing", direction: "asc" },
		]);

		expect(result).toEqual([]);
	});

	it("ignores custom fields whose type does not support sorting", () => {
		const result = resolveCustomFieldSorts(documentFieldsTableSchema, [
			{ key: "_featured", direction: "asc" },
		]);

		expect(result).toEqual([]);
	});

	it("returns nothing when the sort or schema is missing", () => {
		expect(resolveCustomFieldSorts(documentFieldsTableSchema)).toEqual([]);
		expect(
			resolveCustomFieldSorts(undefined, [{ key: "_title", direction: "asc" }]),
		).toEqual([]);
	});
});

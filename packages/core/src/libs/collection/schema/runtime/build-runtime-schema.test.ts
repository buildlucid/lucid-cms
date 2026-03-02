import { describe, expect, test } from "vitest";
import type { CollectionSchema } from "../types.js";
import buildRuntimeSchema from "./build-runtime-schema.js";

describe("buildRuntimeSchema", () => {
	test("removes missing tables and missing columns from local schema", () => {
		const local: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						{
							name: "id",
							source: "core",
							type: "integer",
							nullable: false,
						},
						{
							name: "_title",
							source: "field",
							type: "text",
							nullable: true,
						},
						{
							name: "_summary",
							source: "field",
							type: "text",
							nullable: true,
						},
					],
				},
				{
					name: "lucid_document__pages__hero",
					type: "brick",
					key: { collection: "pages", brick: "hero" },
					columns: [
						{
							name: "id",
							source: "core",
							type: "integer",
							nullable: false,
						},
					],
				},
			],
		};

		const filtered = buildRuntimeSchema(local, {
			missingTableNames: new Set(["lucid_document__pages__hero"]),
			missingColumnsByTable: new Map([
				["lucid_document__pages__fields", new Set(["_summary"])],
			]),
		});

		expect(filtered.tables).toHaveLength(1);
		expect(filtered.tables[0]?.name).toBe("lucid_document__pages__fields");
		expect(filtered.tables[0]?.columns.map((column) => column.name)).toEqual([
			"id",
			"_title",
		]);
	});
});

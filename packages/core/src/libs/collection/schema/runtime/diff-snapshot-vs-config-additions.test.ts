import { describe, expect, test } from "vitest";
import type { CollectionSchema, CollectionSchemaColumn } from "../types.js";
import diffSnapshotVsConfigAdditions from "./diff-snapshot-vs-config-additions.js";

const baseTableColumns: Array<CollectionSchemaColumn> = [
	{ name: "id", source: "core" as const, type: "integer", nullable: false },
	{
		name: "collection_key",
		source: "core" as const,
		type: "text" as const,
		nullable: false,
	},
];

describe("diffSnapshotVsConfigAdditions", () => {
	test("returns missing tables and columns that exist in local schema only", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{
							name: "_title",
							source: "field",
							type: "text",
							nullable: true,
						},
					],
				},
			],
		};

		const local: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{ name: "_title", source: "field", type: "text", nullable: true },
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
					columns: [...baseTableColumns],
				},
			],
		};

		const diff = diffSnapshotVsConfigAdditions(migrated, local);

		expect(
			diff.missingColumnsByTable.get("lucid_document__pages__fields"),
		).toEqual(new Set(["_summary"]));
		expect(diff.missingTableNames).toEqual(
			new Set(["lucid_document__pages__hero"]),
		);
	});

	test("ignores tables/columns present in migrated schema but removed locally", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{
							name: "_old_field",
							source: "field",
							type: "text",
							nullable: true,
						},
					],
				},
				{
					name: "lucid_document__pages__legacy",
					type: "brick",
					key: { collection: "pages", brick: "legacy" },
					columns: [...baseTableColumns],
				},
			],
		};

		const local: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [...baseTableColumns],
				},
			],
		};

		const diff = diffSnapshotVsConfigAdditions(migrated, local);

		expect(diff.missingTableNames.size).toBe(0);
		expect(diff.missingColumnsByTable.size).toBe(0);
	});

	test("ignores non-additive changes when column names are unchanged", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{
							name: "_title",
							source: "field",
							type: "text",
							nullable: true,
						},
					],
				},
			],
		};

		const local: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{
							name: "_title",
							source: "field",
							type: "integer",
							nullable: false,
						},
					],
				},
			],
		};

		const diff = diffSnapshotVsConfigAdditions(migrated, local);

		expect(diff.missingTableNames.size).toBe(0);
		expect(diff.missingColumnsByTable.size).toBe(0);
	});
});

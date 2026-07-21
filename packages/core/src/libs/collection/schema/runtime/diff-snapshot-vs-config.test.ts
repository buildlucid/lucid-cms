import { describe, expect, test } from "vitest";
import type { CollectionSchema, CollectionSchemaColumn } from "../types.js";
import diffSnapshotVsConfig from "./diff-snapshot-vs-config.js";

const baseTableColumns: Array<CollectionSchemaColumn> = [
	{ name: "id", source: "core" as const, type: "integer", nullable: false },
	{
		name: "collection_key",
		source: "core" as const,
		type: "text" as const,
		nullable: false,
	},
];

describe("diffSnapshotVsConfig", () => {
	test("returns missing tables and columns that exist in local schema only", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
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
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
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
					rawName: "lucid_document__pages__hero",
					type: "brick",
					key: { collection: "pages", brick: "hero" },
					columns: [...baseTableColumns],
				},
			],
		};

		const diff = diffSnapshotVsConfig(migrated, local);

		expect(
			diff.missingColumnsByTable.get("lucid_document__pages__fld"),
		).toEqual(new Set(["_summary"]));
		expect(diff.missingTableNames).toEqual(
			new Set(["lucid_document__pages__hero"]),
		);
		expect(diff.missingIndexesByTable.size).toBe(0);
		expect(diff.modifiedColumnsByTable.size).toBe(0);
		expect(diff.modifiedIndexesByTable.size).toBe(0);
	});

	test("ignores tables/columns present in migrated schema but removed locally", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
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
					rawName: "lucid_document__pages__legacy",
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
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [...baseTableColumns],
				},
			],
		};

		const diff = diffSnapshotVsConfig(migrated, local);

		expect(diff.missingTableNames.size).toBe(0);
		expect(diff.missingColumnsByTable.size).toBe(0);
		expect(diff.missingIndexesByTable.size).toBe(0);
		expect(diff.modifiedColumnsByTable.size).toBe(0);
		expect(diff.modifiedIndexesByTable.size).toBe(0);
	});

	test("returns modified columns when definitions change", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
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
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
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

		const diff = diffSnapshotVsConfig(migrated, local);

		expect(diff.missingTableNames.size).toBe(0);
		expect(diff.missingColumnsByTable.size).toBe(0);
		expect(diff.missingIndexesByTable.size).toBe(0);
		expect(
			diff.modifiedColumnsByTable.get("lucid_document__pages__fld"),
		).toEqual(new Set(["_title"]));
	});

	test("returns missing indexes that exist in local schema only", () => {
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{ name: "_title", source: "field", type: "text", nullable: true },
					],
				},
			],
		};

		const local: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						...baseTableColumns,
						{ name: "_title", source: "field", type: "text", nullable: true },
					],
					indexes: [
						{
							name: "lucid_idx__lucid_document__pages__fld___title",
							columns: ["_title"],
							source: "field",
						},
					],
				},
			],
		};

		const diff = diffSnapshotVsConfig(migrated, local);

		expect(
			diff.missingIndexesByTable.get("lucid_document__pages__fld"),
		).toEqual(new Set(["lucid_idx__lucid_document__pages__fld___title"]));
	});

	test.each<{
		label: string;
		change: Partial<CollectionSchemaColumn>;
	}>([
		{ label: "type", change: { type: "integer" } },
		{ label: "nullability", change: { nullable: false } },
		{ label: "default", change: { default: "draft" } },
		{ label: "unique", change: { unique: true } },
		{
			label: "foreign key",
			change: {
				foreignKey: {
					table: "lucid_document__authors",
					column: "id",
				},
			},
		},
	])("detects a $label change", ({ change }) => {
		const snapshotColumn: CollectionSchemaColumn = {
			name: "_value",
			source: "field",
			type: "text",
			nullable: true,
		};
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [...baseTableColumns, snapshotColumn],
				},
			],
		};
		const local: CollectionSchema = {
			...migrated,
			tables: migrated.tables.map((table) => ({
				...table,
				columns: [...baseTableColumns, { ...snapshotColumn, ...change }],
			})),
		};

		const diff = diffSnapshotVsConfig(migrated, local);

		expect(
			diff.modifiedColumnsByTable.get("lucid_document__pages__fld"),
		).toEqual(new Set(["_value"]));
	});

	test("detects an index definition change and ignores index removals", () => {
		const indexName = "lucid_idx__lucid_document__pages__fld___title";
		const migrated: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: baseTableColumns,
					indexes: [
						{ name: indexName, columns: ["id"], source: "core" },
						{ name: "removed_index", columns: ["id"], source: "core" },
					],
				},
			],
		};
		const local: CollectionSchema = {
			...migrated,
			tables: migrated.tables.map((table) => ({
				...table,
				indexes: [
					{ name: indexName, columns: ["id"], source: "core", unique: true },
				],
			})),
		};

		const diff = diffSnapshotVsConfig(migrated, local);

		expect(
			diff.modifiedIndexesByTable.get("lucid_document__pages__fld"),
		).toEqual(new Set([indexName]));
		expect(diff.missingIndexesByTable.size).toBe(0);
	});
});

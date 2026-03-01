import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import { afterAll, describe, expect, test } from "vitest";
import type { CollectionSchema } from "../../../libs/collection/schema/types.js";
import type { InferredTable } from "../../../types.js";
import generateMigrationPlan from "./generate-migration-plan.js";

describe("Generate migration plan", () => {
	const db = new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	});

	afterAll(() => {
		db.client.destroy();
	});

	test("does not remove generated custom field columns", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages__fields",
				columns: [
					{ name: "id", type: "integer", nullable: false, default: null },
					{
						name: "collection_key",
						type: "text",
						nullable: false,
						default: null,
					},
					{ name: "_title", type: "text", nullable: true, default: null },
				],
			},
		];

		const current: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fields",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						{ name: "id", source: "core", type: "integer", nullable: false },
						{
							name: "collection_key",
							source: "core",
							type: "text",
							nullable: false,
						},
					],
				},
			],
		};

		const res = generateMigrationPlan({
			schemas: { existing, current },
			db,
		});

		expect(res.error).toBeUndefined();
		expect(res.data?.tables).toHaveLength(0);
	});

	test("removes missing non-field columns", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages",
				columns: [
					{ name: "id", type: "integer", nullable: false, default: null },
					{
						name: "collection_key",
						type: "text",
						nullable: false,
						default: null,
					},
					{
						name: "created_by",
						type: "integer",
						nullable: true,
						default: null,
					},
				],
			},
		];

		const current: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages",
					type: "document",
					key: { collection: "pages" },
					columns: [
						{ name: "id", source: "core", type: "integer", nullable: false },
						{
							name: "collection_key",
							source: "core",
							type: "text",
							nullable: false,
						},
					],
				},
			],
		};

		const res = generateMigrationPlan({
			schemas: { existing, current },
			db,
		});

		expect(res.error).toBeUndefined();
		expect(res.data?.tables).toHaveLength(1);
		expect(res.data?.tables[0]?.type).toBe("modify");
		expect(res.data?.tables[0]?.columnOperations).toContainEqual({
			type: "remove",
			columnName: "created_by",
		});
	});
});

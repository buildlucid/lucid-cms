import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test, vi } from "vitest";
import type { CollectionSchema } from "../../../libs/collection/schema/types.js";
import type { InferredTable } from "../../../types.js";
import assessMigrationPlans from "./assess-migration-plan.js";
import generateMigrationPlan from "./generate-migration-plan.js";

describe("Generate migration plan", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	test("does not remove generated custom field columns", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages__fld",
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
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
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
					rawName: "lucid_document__pages",
					type: "relation",
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

	test("adds generated indexes that are missing from the database", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages__fld",
				columns: [
					{ name: "id", type: "integer", nullable: false, default: null },
					{ name: "_title", type: "text", nullable: true, default: null },
				],
			},
		];

		const current: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						{ name: "id", source: "core", type: "integer", nullable: false },
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

		const res = generateMigrationPlan({
			schemas: { existing, current },
			db,
		});

		expect(res.error).toBeUndefined();
		expect(res.data?.tables[0]?.indexOperations).toContainEqual({
			type: "add",
			index: current.tables[0]?.indexes?.[0],
		});
	});

	test("removes stale generated indexes", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages__fld",
				columns: [
					{ name: "id", type: "integer", nullable: false, default: null },
					{ name: "_title", type: "text", nullable: true, default: null },
				],
				indexes: [
					{
						name: "lucid_idx__lucid_document__pages__fld___title",
						columns: ["_title"],
						unique: true,
					},
				],
			},
		];

		const current: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						{ name: "id", source: "core", type: "integer", nullable: false },
						{ name: "_title", source: "field", type: "text", nullable: true },
					],
				},
			],
		};

		const res = generateMigrationPlan({
			schemas: { existing, current },
			db,
		});

		expect(res.error).toBeUndefined();
		expect(res.data?.tables[0]?.indexOperations).toContainEqual({
			type: "remove",
			index: {
				name: "lucid_idx__lucid_document__pages__fld___title",
				columns: ["_title"],
				unique: true,
			},
		});
		expect(assessMigrationPlans(res.data ? [res.data] : []).risk).toBe(
			"warning",
		);
	});

	test("does not remove manual indexes", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages__fld",
				columns: [
					{ name: "id", type: "integer", nullable: false, default: null },
					{ name: "_title", type: "text", nullable: true, default: null },
				],
				indexes: [
					{
						name: "manual_title_index",
						columns: ["_title"],
					},
				],
			},
		];

		const current: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						{ name: "id", source: "core", type: "integer", nullable: false },
						{ name: "_title", source: "field", type: "text", nullable: true },
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

	test("classifies unsupported drop-and-add and supported alterations correctly", () => {
		const existing: InferredTable[] = [
			{
				name: "lucid_document__pages__fld",
				columns: [
					{ name: "_title", type: "text", nullable: false, default: null },
				],
			},
		];
		const current: CollectionSchema = {
			key: "pages",
			tables: [
				{
					name: "lucid_document__pages__fld",
					rawName: "lucid_document__pages__fld",
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
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

		const unsupportedResult = generateMigrationPlan({
			schemas: { existing, current },
			db,
		});
		expect(unsupportedResult.error).toBeUndefined();
		expect(
			assessMigrationPlans(
				unsupportedResult.data ? [unsupportedResult.data] : [],
			).risk,
		).toBe("destructive");

		const supportSpy = vi
			.spyOn(db, "supports")
			.mockImplementation((key) =>
				key === "alterColumn" ? true : db.config.support[key],
			);
		const supportedResult = generateMigrationPlan({
			schemas: { existing, current },
			db,
		});
		supportSpy.mockRestore();

		expect(supportedResult.error).toBeUndefined();
		expect(
			assessMigrationPlans(supportedResult.data ? [supportedResult.data] : [])
				.risk,
		).toBe("safe");
		expect(supportedResult.data?.tables[0]?.columnOperations[0]?.type).toBe(
			"modify",
		);
	});
});

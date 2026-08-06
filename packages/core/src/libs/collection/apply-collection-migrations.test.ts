import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { ServiceContext } from "../../types.js";
import createLucidDatabase from "../db/create-lucid-database.js";
import type { DatabaseConnection } from "../db/types.js";
import applyCollectionMigrations from "./apply-collection-migrations.js";
import type { CollectionMigrationPlan } from "./migration/types.js";

describe("applyCollectionMigrations", () => {
	let db: SQLiteAdapter;
	let connection: DatabaseConnection;
	let context: ServiceContext;

	beforeEach(async () => {
		db = new SQLiteAdapter({ database: ":memory:" });
		connection = await db.connect();
		await db.migrateCoreToLatest(connection);
		await connection.client
			.insertInto("lucid_collections")
			.values({ key: "pages" })
			.execute();

		// @ts-expect-error
		context = {
			db: createLucidDatabase({ client: connection.client, adapter: db }),
			config: { db, tables: [] },
		} as ServiceContext;
	});

	afterEach(async () => {
		await connection.destroy();
	});

	/** Builds an exact plan that creates one standalone test table. */
	const createExactPlan = (): CollectionMigrationPlan => {
		const table = {
			name: "lucid_document__pages__planned",
			rawName: "lucid_document__pages__planned",
			type: "document-fields" as const,
			key: { collection: "pages" },
			columns: [
				{
					name: "id",
					source: "core" as const,
					type: "integer" as const,
					nullable: false,
				},
			],
		};
		return {
			collections: [
				{
					inferredSchema: { key: "pages", tables: [table] },
					migrationPlan: {
						collectionKey: "pages",
						tables: [
							{
								type: "create",
								tableName: table.name,
								tableType: table.type,
								key: table.key,
								priority: 0,
								columnOperations: table.columns.map((column) => ({
									type: "add" as const,
									column,
								})),
								indexOperations: [],
							},
						],
					},
				},
			],
		};
	};

	test("executes the supplied exact plan and inserts its snapshot", async () => {
		const plan = createExactPlan();

		const result = await applyCollectionMigrations(context, plan);
		const inferred = await db.inferSchema(connection.client);
		const snapshotsResult = await context.db
			.query("test.collection-migrations.find", (database) =>
				database.selectFrom("lucid_collection_migrations").selectAll(),
			)
			.many();

		expect(result.error).toBeUndefined();
		expect(snapshotsResult.error).toBeUndefined();
		expect(inferred.map((table) => table.name)).toContain(
			"lucid_document__pages__planned",
		);
		const snapshots = snapshotsResult.data ?? [];
		expect(snapshots).toHaveLength(1);
		expect(snapshots[0]?.collection_key).toBe("pages");
		expect(snapshots[0]?.migration_plans).toEqual(
			plan.collections[0]?.migrationPlan,
		);
		expect(snapshots[0]?.collection_schema).toEqual(
			plan.collections[0]?.inferredSchema,
		);
	});

	test("rolls back table changes when snapshot insertion fails", async () => {
		await connection.client.schema
			.dropTable("lucid_collection_migrations")
			.ifExists()
			.execute();

		const result = await applyCollectionMigrations(context, createExactPlan());
		const inferred = await db.inferSchema(connection.client);

		expect(result.error).toBeDefined();
		expect(inferred.map((table) => table.name)).not.toContain(
			"lucid_document__pages__planned",
		);
	});

	test("records a no-op snapshot without creating tables", async () => {
		const plan: CollectionMigrationPlan = {
			collections: [
				{
					inferredSchema: { key: "pages", tables: [] },
					migrationPlan: { collectionKey: "pages", tables: [] },
				},
			],
		};

		const result = await applyCollectionMigrations(context, plan);
		const snapshotsResult = await context.db
			.query("test.collection-migrations.no-op.find", (database) =>
				database.selectFrom("lucid_collection_migrations").selectAll(),
			)
			.many();

		expect(result.error).toBeUndefined();
		expect(snapshotsResult.error).toBeUndefined();
		const snapshots = snapshotsResult.data ?? [];
		expect(snapshots).toHaveLength(1);
		expect(snapshots[0]?.migration_plans).toEqual({
			collectionKey: "pages",
			tables: [],
		});
	});
});

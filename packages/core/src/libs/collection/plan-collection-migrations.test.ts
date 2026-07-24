import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import type { ServiceContext } from "../../types.js";
import { copy } from "../i18n/index.js";
import CollectionBuilder from "./builders/collection-builder/index.js";
import planCollectionMigrations from "./plan-collection-migrations.js";

describe("planCollectionMigrations", async () => {
	const db = new SQLiteAdapter({ database: ":memory:" });
	const connection = await db.connect();

	afterAll(async () => {
		await connection.destroy();
	});

	test("returns inferred schemas and exact plans without mutating the database", async () => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: copy.literal("Pages"),
				singularName: copy.literal("Page"),
			},
		}).addText("title");

		// @ts-expect-error
		const context = {
			db: { client: connection.client },
			config: { db, collections: [pages] },
		} as ServiceContext;

		const result = await planCollectionMigrations(context);
		const inferredAfterPlanning = await db.inferSchema(connection.client);

		expect(result.error).toBeUndefined();
		expect(result.data?.collections).toHaveLength(1);
		expect(result.data?.collections[0]?.inferredSchema.key).toBe("pages");
		expect(result.data?.collections[0]?.migrationPlan.collectionKey).toBe(
			"pages",
		);
		expect(result.data?.collections[0]?.migrationPlan.tables).not.toHaveLength(
			0,
		);
		expect(inferredAfterPlanning).toEqual([]);
	});
});

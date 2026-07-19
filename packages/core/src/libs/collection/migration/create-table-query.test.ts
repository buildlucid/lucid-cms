import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { translate } from "../../i18n/index.js";
import createTableQuery from "./create-table-query.js";

describe("createTableQuery", () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	test("creates generated indexes after creating the table", async () => {
		// @ts-expect-error
		const context = {
			db: {
				client: db.client,
			},
			config: {
				db,
			},
		} as ServiceContext;
		const indexName = `${constants.db.generatedIndexPrefix}lucid_test_indexes___title`;

		const res = await createTableQuery(context, {
			migration: {
				type: "create",
				tableName: "lucid_test_indexes",
				priority: 0,
				columnOperations: [
					{
						type: "add",
						column: {
							name: "id",
							source: "core",
							type: db.getDataType("integer"),
							nullable: false,
						},
					},
					{
						type: "add",
						column: {
							name: "_title",
							source: "field",
							type: db.getDataType("text"),
							nullable: true,
						},
					},
				],
				indexOperations: [
					{
						type: "add",
						index: {
							name: indexName,
							columns: ["_title"],
							source: "field",
						},
					},
				],
			},
		});

		const inferred = await db.inferSchema(db.client);
		const table = inferred.find((item) => item.name === "lucid_test_indexes");

		expect(res.error).toBeUndefined();
		expect(table?.indexes).toContainEqual(
			expect.objectContaining({
				name: indexName,
				columns: ["_title"],
				unique: false,
			}),
		);
	});

	test("includes the table name and database error in failures", async () => {
		const tableName = "lucid_existing_collection_table";
		await db.client.schema
			.createTable(tableName)
			.addColumn("id", "integer")
			.execute();

		// @ts-expect-error
		const context = {
			db: {
				client: db.client,
			},
			config: {
				db,
			},
		} as ServiceContext;
		const res = await createTableQuery(context, {
			migration: {
				type: "create",
				tableName,
				priority: 0,
				columnOperations: [],
				indexOperations: [],
			},
		});

		expect(res.error?.message).not.toHaveProperty("defaultMessage");
		expect(translate(res.error?.message)).toContain(
			`Failed to create collection table "${tableName}":`,
		);
		expect(translate(res.error?.message)).toContain("already exists");
	});
});

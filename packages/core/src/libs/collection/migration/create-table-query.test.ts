import { SQLiteAdapter } from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import createTableQuery from "./create-table-query.js";

describe("createTableQuery", () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	test("creates generated indexes after creating the table", async () => {
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
});

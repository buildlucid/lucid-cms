import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import modifyTableQuery from "./modify-table-query.js";

describe("modifyTableQuery", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();
	const indexName = `${constants.db.generatedIndexPrefix}lucid_modify_indexes___title`;
	const context = {
		db: {
			client: connection.client,
		},
		config: {
			db,
		},
	} as ServiceContext;

	beforeEach(async () => {
		await connection.client.schema
			.dropTable("lucid_modify_indexes")
			.ifExists()
			.execute();
		await connection.client.schema
			.createTable("lucid_modify_indexes")
			.addColumn("id", db.getDataType("integer"))
			.addColumn("_title", db.getDataType("text"))
			.execute();
	});

	afterAll(() => connection.destroy());

	test("adds and removes generated indexes on table modification", async () => {
		const addRes = await modifyTableQuery(context, {
			migration: {
				type: "modify",
				tableName: "lucid_modify_indexes",
				priority: 0,
				columnOperations: [],
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
		let table = (await db.inferSchema(connection.client)).find(
			(item) => item.name === "lucid_modify_indexes",
		);

		expect(addRes.error).toBeUndefined();
		expect(table?.indexes?.map((index) => index.name)).toContain(indexName);

		const removeRes = await modifyTableQuery(context, {
			migration: {
				type: "modify",
				tableName: "lucid_modify_indexes",
				priority: 0,
				columnOperations: [],
				indexOperations: [
					{
						type: "remove",
						index: {
							name: indexName,
							columns: ["_title"],
							unique: false,
						},
					},
				],
			},
		});
		table = (await db.inferSchema(connection.client)).find(
			(item) => item.name === "lucid_modify_indexes",
		);

		expect(removeRes.error).toBeUndefined();
		expect(table?.indexes?.map((index) => index.name) ?? []).not.toContain(
			indexName,
		);
	});
});

import { SQLiteAdapter } from "@lucidcms/sqlite-adapter";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import modifyTableQuery from "./modify-table-query.js";

describe("modifyTableQuery", () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const indexName = `${constants.db.generatedIndexPrefix}lucid_modify_indexes___title`;
	const context = {
		db: {
			client: db.client,
		},
		config: {
			db,
		},
	} as ServiceContext;

	beforeEach(async () => {
		await db.client.schema
			.dropTable("lucid_modify_indexes")
			.ifExists()
			.execute();
		await db.client.schema
			.createTable("lucid_modify_indexes")
			.addColumn("id", db.getDataType("integer"))
			.addColumn("_title", db.getDataType("text"))
			.execute();
	});

	afterAll(() => {
		db.client.destroy();
	});

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
		let table = (await db.inferSchema(db.client)).find(
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
						indexName,
					},
				],
			},
		});
		table = (await db.inferSchema(db.client)).find(
			(item) => item.name === "lucid_modify_indexes",
		);

		expect(removeRes.error).toBeUndefined();
		expect(table?.indexes?.map((index) => index.name) ?? []).not.toContain(
			indexName,
		);
	});
});

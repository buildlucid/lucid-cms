import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, assert, beforeEach, describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import createLucidDatabase from "../../db/create-lucid-database.js";
import generateMigrationPlan from "./generate-migration-plan.js";
import modifyTableQuery from "./modify-table-query.js";

describe("modifyTableQuery", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();
	const indexName = `${constants.db.generatedIndexPrefix}lucid_modify_indexes___title`;
	const context = {
		db: createLucidDatabase({ client: connection.client, adapter: db }),
		config: {
			db,
			tables: [],
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

	test("rebuilds generated indexes on a column it drops and adds again", async () => {
		const fkIndexName = `${constants.db.generatedIndexPrefix}lucid_modify_fk___ref`;
		for (const name of [
			"lucid_modify_fk",
			"lucid_modify_old",
			"lucid_modify_new",
		]) {
			await connection.client.schema.dropTable(name).ifExists().execute();
		}
		for (const name of ["lucid_modify_old", "lucid_modify_new"]) {
			await connection.client.schema
				.createTable(name)
				.addColumn("id", db.getDataType("text"), (col) => col.primaryKey())
				.execute();
		}
		await connection.client.schema
			.createTable("lucid_modify_fk")
			.addColumn("id", db.getDataType("integer"))
			.addColumn("_ref", db.getDataType("text"), (col) =>
				col.references("lucid_modify_old.id").onDelete("set null"),
			)
			.execute();
		await connection.client.schema
			.createIndex(fkIndexName)
			.on("lucid_modify_fk")
			.column("_ref")
			.execute();
		const inferTable = async () =>
			(await db.inferSchema(connection.client)).find(
				(item) => item.name === "lucid_modify_fk",
			);
		const existing = await inferTable();
		assert(existing);

		//* a new foreign key target can't be altered in place, so the column is rebuilt
		const plan = generateMigrationPlan({
			schemas: {
				existing: [existing],
				current: {
					key: "pages",
					tables: [
						{
							name: "lucid_modify_fk",
							rawName: "lucid_modify_fk",
							type: "document-fields",
							key: { collection: "pages" },
							columns: [
								{ name: "id", source: "core", type: "integer", nullable: true },
								{
									name: "_ref",
									source: "core",
									type: "text",
									nullable: true,
									foreignKey: {
										table: "lucid_modify_new",
										column: "id",
										onDelete: "set null",
									},
								},
							],
							indexes: [
								{ name: fkIndexName, columns: ["_ref"], source: "core" },
							],
						},
					],
				},
			},
			db,
		});
		const migration = plan.data?.tables[0];
		assert(migration?.type === "modify", JSON.stringify(plan));

		const res = await modifyTableQuery(context, { migration });
		expect(res.error).toBeUndefined();
		const table = await inferTable();
		expect(
			table?.columns.find((column) => column.name === "_ref")?.foreignKey,
		).toMatchObject({ table: "lucid_modify_new", column: "id" });
		expect(table?.indexes?.map((index) => index.name)).toContain(fkIndexName);
	});
});

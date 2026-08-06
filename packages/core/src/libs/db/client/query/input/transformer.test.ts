import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { z } from "zod";
import createLucidDatabase from "../../../create-lucid-database.js";
import type { DatabaseConnection } from "../../../types.js";
import type { DatabaseCodec } from "../../codecs/types.js";
import type LucidDatabase from "../../lucid-database.js";
import { defineTable } from "../../table/definition.js";

type InputTable = {
	id: number;
	value: string;
};

describe("query input codecs", () => {
	let connection: DatabaseConnection;
	let database: LucidDatabase;

	const codec: DatabaseCodec<string, string> = {
		name: "test-input",
		encodes: true,
		decodes: false,
		encode(value, context) {
			expect(context.columnType).toBe("text");
			return `encoded(${value})`;
		},
		decode: (value) => value,
	};

	beforeAll(async () => {
		const adapter = new SQLiteAdapter({ database: ":memory:" });
		connection = await adapter.connect();
		database = createLucidDatabase({
			client: connection.client,
			adapter,
			tables: [
				defineTable<InputTable>("input_values", {
					columns: {
						id: { schema: z.number(), type: "integer" },
						value: { schema: z.string(), type: "text", codec },
					},
				}),
			],
		});
	});

	afterAll(async () => {
		await connection.destroy();
	});

	test("encodes every positional value in multi-row inserts", () => {
		const compiled = database.kysely
			.$extendTables<{ input_values: InputTable }>()
			.insertInto("input_values")
			.values([
				{ id: 1, value: "one" },
				{ id: 2, value: "two" },
			])
			.compile();

		expect(compiled.parameters).toEqual([1, "encoded(one)", 2, "encoded(two)"]);
	});

	test("resolves aliases, lists and references on either side of predicates", () => {
		const compiled = database.kysely
			.$extendTables<{ input_values: InputTable }>()
			.selectFrom("input_values as item")
			.selectAll()
			.where((eb) =>
				eb.and([
					eb("item.value", "=", "one"),
					eb("item.value", "in", ["two", "three"]),
					eb(eb.val("four"), "=", eb.ref("item.value")),
				]),
			)
			.compile();

		expect(compiled.parameters).toEqual([
			"encoded(one)",
			"encoded(two)",
			"encoded(three)",
			"encoded(four)",
		]);
	});

	test("encodes update assignments and their predicates", () => {
		const compiled = database.kysely
			.$extendTables<{ input_values: InputTable }>()
			.updateTable("input_values")
			.set({ value: "one" })
			.where("value", "=", "two")
			.compile();

		expect(compiled.parameters).toEqual(["encoded(one)", "encoded(two)"]);
	});

	test("does not rewrite values owned by a SQL expression", () => {
		const compiled = database.kysely
			.$extendTables<{ input_values: InputTable }>()
			.selectFrom("input_values")
			.selectAll()
			.where("value", "=", sql<string>`upper(${"one"})`)
			.compile();

		expect(compiled.parameters).toEqual(["one"]);
	});
});

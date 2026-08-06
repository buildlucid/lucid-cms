import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	expectTypeOf,
	test,
} from "vitest";
import { z } from "zod";
import createLucidDatabase from "../create-lucid-database.js";
import type { DatabaseConnection } from "../types.js";
import type { DatabaseCodec } from "./codecs/types.js";
import type LucidDatabase from "./lucid-database.js";
import { defineTable } from "./table/definition.js";

type CodecTable = {
	id: number;
	value: string;
};

type JsonTable = {
	id: number;
	payload: { nested: unknown[] };
	label: string;
	scalar: unknown;
};

describe("LucidDatabase codecs", () => {
	let adapter: SQLiteAdapter;
	let connection: DatabaseConnection;
	let database: LucidDatabase;
	let encodeCount = 0;
	let decodeCount = 0;

	const codec: DatabaseCodec<string, string> = {
		name: "test-wrapper",
		encodes: true,
		decodes: true,
		encode(value, context) {
			expect(context.columnType).toBe("text");
			encodeCount += 1;
			return `encoded(${value})`;
		},
		decode(value, context) {
			expect(context.columnType).toBe("text");
			decodeCount += 1;
			return value.slice("encoded(".length, -1);
		},
	};

	beforeAll(async () => {
		adapter = new SQLiteAdapter({ database: ":memory:" });
		connection = await adapter.connect();
		const codecTable = defineTable<CodecTable>("test_codec", {
			columns: {
				id: { schema: z.number(), type: "integer" },
				value: { schema: z.string(), type: "text", codec },
			},
		});
		const jsonTable = defineTable<JsonTable>("test_json", {
			columns: {
				id: { schema: z.number(), type: "integer" },
				payload: {
					schema: z.object({ nested: z.array(z.unknown()) }),
					type: "json",
				},
				label: { schema: z.string(), type: "text" },
				scalar: { schema: z.unknown(), type: "json" },
			},
		});
		database = createLucidDatabase({
			client: connection.client,
			adapter,
			tables: [codecTable, jsonTable],
		});
		await connection.client.schema
			.createTable("test_codec")
			.addColumn("id", "integer", (column) => column.primaryKey())
			.addColumn("value", "text", (column) => column.notNull())
			.execute();
		await connection.client.schema
			.createTable("test_json")
			.addColumn("id", "integer", (column) => column.primaryKey())
			.addColumn("payload", "json", (column) => column.notNull())
			.addColumn("label", "text", (column) => column.notNull())
			.addColumn("scalar", "json", (column) => column.notNull())
			.execute();
	});

	afterAll(async () => {
		await connection.destroy();
	});

	test("encodes nested subquery values exactly once and decodes their path", async () => {
		const inserted = await database
			.query("test.codec.insert", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.insertInto("test_codec")
					.values({ id: 1, value: "one" }),
			)
			.many();
		expect(inserted.error).toBeUndefined();
		expect(encodeCount).toBe(1);

		encodeCount = 0;
		decodeCount = 0;
		const selected = await database
			.query("test.codec.select", (db) =>
				db.selectNoFrom(() => [
					database.fn
						.jsonArrayFrom(
							db
								.$extendTables<{ test_codec: CodecTable }>()
								.selectFrom("test_codec")
								.select("value")
								.where("value", "=", "one"),
						)
						.as("rows"),
				]),
			)
			.first();

		expect(selected).toEqual({
			error: undefined,
			data: { rows: [{ value: "one" }] },
		});
		expect(encodeCount).toBe(1);
		expect(decodeCount).toBe(1);

		encodeCount = 0;
		decodeCount = 0;
		const selectedFromCte = await database
			.query("test.codec.cte", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.with("codec_rows", (qb) =>
						qb.selectFrom("test_codec").select(["id", "value"]),
					)
					.selectFrom("codec_rows")
					.select("value")
					.where("value", "=", "one"),
			)
			.first({ required: true });

		expect(selectedFromCte).toEqual({
			error: undefined,
			data: { value: "one" },
		});
		expect(encodeCount).toBe(1);
		expect(decodeCount).toBe(1);

		encodeCount = 0;
		decodeCount = 0;
		const selectedFromNamedCte = await database
			.query("test.codec.named-cte", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.with("codec_rows(id, aliased_value)", (qb) =>
						qb
							.selectFrom("test_codec")
							.select(["id", "value"])
							.$castTo<{ id: number; aliased_value: string }>(),
					)
					.selectFrom("codec_rows")
					.select("aliased_value")
					.where("aliased_value", "=", "one"),
			)
			.first({ required: true });

		expect(selectedFromNamedCte).toEqual({
			error: undefined,
			data: { aliased_value: "one" },
		});
		expect(encodeCount).toBe(1);
		expect(decodeCount).toBe(1);
	});

	test("returns the validated schema output", async () => {
		const selected = await database
			.query("test.codec.validated", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.selectFrom("test_codec")
					.select(["id", "value"]),
			)
			.many({ schema: z.object({ id: z.number() }) });

		expect(selected).toEqual({ error: undefined, data: [{ id: 1 }] });
		if (!selected.error) {
			expectTypeOf(selected.data).toEqualTypeOf<Array<{ id: number }>>();
		}
	});

	test("returns validation details when a result does not match its schema", async () => {
		const selected = await database
			.query("test.codec.invalid-response", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.selectFrom("test_codec")
					.select(["id", "value"]),
			)
			.many({ schema: z.object({ id: z.string() }) });

		expect(selected.data).toBeUndefined();
		expect(selected.error?.status).toBe(400);
		expect(selected.error?.zod).toBeDefined();
	});

	test("returns a not-found error when a required first row is missing", async () => {
		const selected = await database
			.query("test.codec.required", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.selectFrom("test_codec")
					.select("id")
					.where("id", "=", 999),
			)
			.first({ required: true });

		expect(selected).toEqual({
			data: undefined,
			error: { status: 404 },
		});
	});

	test("applies codecs to updates, predicates and returning rows", async () => {
		encodeCount = 0;
		decodeCount = 0;
		const updated = await database
			.query("test.codec.update", (db) =>
				db
					.$extendTables<{ test_codec: CodecTable }>()
					.updateTable("test_codec")
					.set({ value: "two" })
					.where("value", "=", "one")
					.returning("value"),
			)
			.first({ required: true });

		expect(updated).toEqual({ error: undefined, data: { value: "two" } });
		expect(encodeCount).toBe(2);
		expect(decodeCount).toBe(1);
	});

	test("decodes declared JSON paths without parsing JSON-looking text", async () => {
		const row = {
			id: 1,
			payload: { nested: ['["still text"]', { enabled: true }] },
			label: '["still text"]',
			scalar: "a JSON string value",
		};
		const inserted = await database
			.query("test.json.insert", (db) =>
				db
					.$extendTables<{ test_json: JsonTable }>()
					.insertInto("test_json")
					.values(row),
			)
			.many();
		expect(inserted.error).toBeUndefined();

		const selected = await database
			.query("test.json.aggregate", (db) =>
				db.selectNoFrom(() => [
					database.fn
						.jsonArrayFrom(
							db
								.$extendTables<{ test_json: JsonTable }>()
								.selectFrom("test_json")
								.select(["id", "payload", "label", "scalar"]),
						)
						.as("rows"),
				]),
			)
			.first({ required: true });

		expect(selected).toEqual({ error: undefined, data: { rows: [row] } });
	});

	test("handles construction failures inside the managed envelope", async () => {
		const selected = await database
			.query("test.codec.invalid", () => {
				throw new Error("query could not be built");
			})
			.many();

		expect(selected.data).toBeUndefined();
		expect(selected.error?.status).toBe(500);
	});
});

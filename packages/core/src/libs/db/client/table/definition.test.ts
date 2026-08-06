import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { codecs } from "../codecs/index.js";
import { defineRuntimeTable, defineTable } from "./definition.js";
import TableRegistry from "./registry.js";

type CustomTable = {
	id: number;
	payload: Record<string, unknown>;
};

declare module "../../types.js" {
	interface LucidDB {
		lucid_table_definition_type_test: {
			value: string;
		};
	}
}

// @ts-expect-error Core table schemas must match their declared row values.
defineTable("lucid_table_definition_type_test", {
	columns: {
		value: {
			schema: z.record(z.string(), z.string()),
			type: "text",
		},
	},
});

describe("table definitions", () => {
	const adapter = new SQLiteAdapter({ database: ":memory:" });

	test("resolves portable types and their default codecs", () => {
		const definition = defineTable<CustomTable>("custom_table", {
			columns: {
				id: { schema: z.number(), type: "primary" },
				payload: {
					schema: z.record(z.string(), z.unknown()),
					type: "json",
				},
			},
		});

		const resolved = definition.resolve(adapter);
		expect(resolved.columns.id?.dataType).toBe("integer");
		expect(resolved.columns.payload?.codec).toBe(codecs.json);
		expect(resolved.schema.safeParse({ id: 1, payload: {} }).success).toBe(
			true,
		);
	});

	test("uses explicit logical metadata for non-standard physical types", () => {
		const resolved = defineRuntimeTable({
			name: "generated_table",
			columns: [
				{
					name: "payload",
					type: "text",
					logicalType: "json",
				},
			],
		});

		expect(resolved.columns.payload?.type).toBe("json");
		expect(resolved.columns.payload?.codec).toBe(codecs.json);
	});

	test("prefers exact definitions over matching generated-table patterns", () => {
		const pattern = defineTable<{ value: string }>(
			"generated_pattern",
			{
				columns: { value: { schema: z.string(), type: "text" } },
			},
			{ matches: (name) => name.startsWith("generated_") },
		);
		const exact = defineTable<{ value: string }>("generated_exact", {
			columns: { value: { schema: z.string(), type: "varchar" } },
		});
		const registry = new TableRegistry(adapter, [pattern, exact]);

		expect(registry.resolve("generated_exact")?.columns.value?.type).toBe(
			"varchar",
		);
		expect(registry.resolve("generated_other")?.name).toBe("generated_pattern");
	});
});

import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { describe, expect, test } from "vitest";
import { codecs } from "./built-in.js";

describe("built-in database codecs", () => {
	const adapter = new SQLiteAdapter({ database: ":memory:" });

	test("serializes JSON inputs and decodes one database serialization layer", () => {
		const value = {
			language: "json",
			value: '{"scripts":{"dev":"lucidcms dev"}}',
		};

		const encoded = codecs.json.encode(value, { adapter, columnType: "json" });

		expect(encoded).toBe(JSON.stringify(value));
		expect(
			codecs.json.decode(encoded, { adapter, columnType: "json" }),
		).toEqual(value);
	});

	test("keeps driver-native JSON values intact", () => {
		const value = [{ enabled: true }];

		expect(codecs.json.decode(value, { adapter, columnType: "json" })).toBe(
			value,
		);
	});

	test("normalizes booleans for adapters without native boolean columns", () => {
		expect(codecs.boolean.encode(true, { adapter })).toBe(1);
		expect(codecs.boolean.encode(false, { adapter })).toBe(0);
		expect(codecs.integer.encode(true, { adapter })).toBe(1);
	});
});

import { expect, test } from "vitest";
import DatabaseAdapter from "./adapter-base.js";

const formatResultValue = DatabaseAdapter.prototype.formatResultValue.bind(
	{} as DatabaseAdapter,
);

test("decodes one JSON serialization layer without parsing nested strings", () => {
	const nestedCode = '{"scripts":{"dev":"lucidcms dev"}}';
	const storedValue = JSON.stringify({
		language: "json",
		value: nestedCode,
	});

	expect(formatResultValue("json", storedValue)).toEqual({
		language: "json",
		value: nestedCode,
	});
});

test("leaves already decoded JSON values unchanged", () => {
	const value = {
		language: "json",
		value: '{"scripts":{}}',
	};

	expect(formatResultValue("jsonb", value)).toBe(value);
});

test("does not inspect JSON-looking strings from non-JSON columns", () => {
	const value = '{"scripts":{"dev":"lucidcms dev"}}';

	expect(formatResultValue("text", value)).toBe(value);
});

test("rejects invalid serialized values from declared JSON columns", () => {
	expect(() => formatResultValue("json", "not-json")).toThrow();
});

import { isOperationNodeSource, sql } from "kysely";
import { expect, test } from "vitest";
import { PostgresAdapter } from "./index.js";

test("leaves JSON values for postgres.js to serialize once", () => {
	const value = { pending: { widget: { key: "screen" } } };

	expect(new PostgresAdapter().formatInsertValue("jsonb", value)).toBe(value);
});

test("keeps NOW() as an expression for timestamptz column defaults", () => {
	const value = new PostgresAdapter().formatDefaultValue(
		"timestamptz",
		"NOW()",
	);

	expect(isOperationNodeSource(value) && value.toOperationNode()).toEqual(
		sql.raw("NOW()").toOperationNode(),
	);
});

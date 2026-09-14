import { expect, test } from "vitest";
import getQueryBatchSize from "./get-query-batch-size.js";

test("reserves conflict parameters when batching multi-column inserts", () => {
	expect(
		getQueryBatchSize(100, { parametersPerItem: 5, reservedParameters: 2 }),
	).toBe(19);
	expect(
		getQueryBatchSize(65_535, {
			parametersPerItem: 5,
			reservedParameters: 2,
			maxItems: 200,
		}),
	).toBe(200);
});

test("rejects budgets that cannot execute one item", () => {
	expect(() => getQueryBatchSize(4, { parametersPerItem: 5 })).toThrow(
		RangeError,
	);
	expect(() => getQueryBatchSize(100, { parametersPerItem: 0 })).toThrow(
		RangeError,
	);
	expect(() =>
		getQueryBatchSize(100, { parametersPerItem: 1, reservedParameters: 100 }),
	).toThrow(RangeError);
});

import { expect, test } from "vitest";
import getFilterValues from "./get-filter-values.js";

test("normalizes query filter values", () => {
	expect(getFilterValues(undefined)).toBeUndefined();
	expect(getFilterValues({ value: "todo" })).toEqual(["todo"]);
	expect(getFilterValues({ value: 1 })).toEqual([1]);
	expect(getFilterValues({ value: ["1", "2"] })).toEqual(["1", "2"]);
	expect(getFilterValues({ value: [1, 2] })).toEqual([1, 2]);
	expect(getFilterValues({ value: null })).toEqual([]);
});

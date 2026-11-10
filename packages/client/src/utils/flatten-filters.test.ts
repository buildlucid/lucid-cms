import { describe, expect, test } from "vitest";
import flattenFilters from "./flatten-filters.js";

describe("flattenFilters", () => {
	test("turns plain values into equality conditions with dotted keys", () => {
		expect(
			flattenFilters({
				id: 1,
				fields: { title: "News" },
				bricks: { hero: { heading: "Hello" } },
			}),
		).toEqual([
			{ key: "id", value: 1 },
			{ key: "fields.title", value: "News" },
			{ key: "bricks.hero.heading", value: "Hello" },
		]);
	});

	test("keeps a given operator", () => {
		expect(
			flattenFilters({
				fields: { title: { value: "News", operator: "starts-with" } },
			}),
		).toEqual([
			{ key: "fields.title", value: "News", operator: "starts-with" },
		]);
	});

	test("matches arrays with `in` and null with `is` unless an operator is given", () => {
		expect(
			flattenFilters({
				id: [1, 2],
				createdBy: { value: [3], operator: "not-in" },
				fields: { parent: null },
			}),
		).toEqual([
			{ key: "id", value: [1, 2], operator: "in" },
			{ key: "createdBy", value: [3], operator: "not-in" },
			{ key: "fields.parent", value: null, operator: "is" },
		]);
	});

	test("treats a field named `value` as a field, not a condition", () => {
		expect(
			flattenFilters({
				fields: { value: 5 },
				bricks: { stat: { value: { value: 5, operator: ">" } } },
			}),
		).toEqual([
			{ key: "fields.value", value: 5 },
			{ key: "bricks.stat.value", value: 5, operator: ">" },
		]);
	});

	test("follows relation fields into the related document's filters", () => {
		expect(
			flattenFilters({
				fields: { author: { people: { fields: { name: "Will" } } } },
			}),
		).toEqual([{ key: "fields.author.people.fields.name", value: "Will" }]);
	});

	test("skips undefined values", () => {
		expect(
			flattenFilters({ id: undefined, fields: { title: undefined } }),
		).toEqual([]);
		expect(flattenFilters(undefined)).toEqual([]);
	});
});

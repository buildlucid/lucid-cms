import { describe, expect, test } from "vitest";
import normalizeFilter from "./normalize-filter.js";

describe("normalizeFilter", () => {
	test("treats a plain value as equals and keeps the toolkit's own shape", () => {
		expect(
			normalizeFilter({
				_fullSlug: "/en/about",
				_views: { value: 10, operator: ">" },
			}),
		).toEqual({
			_fullSlug: { value: "/en/about" },
			_views: { value: 10, operator: ">" },
		});
	});

	test("normalizes nested groups and lists of groups joined with OR", () => {
		expect(
			normalizeFilter([{ banner: { _title: "Hi" } }, { _slug: "a" }]),
		).toEqual([
			{ banner: { _title: { value: "Hi" } } },
			{ _slug: { value: "a" } },
		]);
	});

	test("leaves out a filter that isn't a hash or list", () => {
		expect(normalizeFilter(undefined)).toBeUndefined();
		expect(normalizeFilter("about")).toBeUndefined();
	});
});

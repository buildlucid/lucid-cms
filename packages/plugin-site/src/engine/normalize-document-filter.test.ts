import { describe, expect, test } from "vitest";
import normalizeDocumentFilter from "./normalize-document-filter.js";

describe("normalizeDocumentFilter", () => {
	test("treats a plain value as equals and keeps the toolkit's own shape", () => {
		expect(
			normalizeDocumentFilter({
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
			normalizeDocumentFilter([{ banner: { _title: "Hi" } }, { _slug: "a" }]),
		).toEqual([
			{ banner: { _title: { value: "Hi" } } },
			{ _slug: { value: "a" } },
		]);
	});

	test("leaves out a filter that isn't a hash or list", () => {
		expect(normalizeDocumentFilter(undefined)).toBeUndefined();
		expect(normalizeDocumentFilter("about")).toBeUndefined();
	});
});

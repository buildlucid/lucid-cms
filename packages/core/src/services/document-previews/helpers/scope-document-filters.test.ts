import { describe, expect, it } from "vitest";
import scopeDocumentFilters from "./scope-document-filters.js";

describe("preview document query scope", () => {
	it("overrides caller filters with the authorized active document", () => {
		expect(
			scopeDocumentFilters(
				{
					id: { value: 999 },
					isDeleted: { value: true },
					_title: { value: "Home" },
				},
				42,
				0,
			),
		).toEqual({
			id: { value: 42 },
			isDeleted: { value: 0 },
			_title: { value: "Home" },
		});
	});

	it("leaves ordinary queries unchanged", () => {
		const filters = { _title: { value: "Home" } };
		expect(scopeDocumentFilters(filters, undefined, 0)).toBe(filters);
	});
});

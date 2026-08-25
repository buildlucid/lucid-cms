import { describe, expect, it } from "vitest";
import { upsertRefs } from "./document-ref-helpers";

describe("upsertRefs", () => {
	it("replaces matching refs without mutating the current list", () => {
		const current = [
			{ id: 1, label: "Old" },
			{ id: 2, label: "Unchanged" },
		];

		const result = upsertRefs(
			current,
			{ id: 1, label: "New" },
			(existing, next) => existing.id === next.id,
		);

		expect(result).toEqual([
			{ id: 1, label: "New" },
			{ id: 2, label: "Unchanged" },
		]);
		expect(current[0]?.label).toBe("Old");
	});

	it("appends unseen refs in input order", () => {
		const result = upsertRefs(
			undefined,
			[
				{ id: 1, label: "First" },
				{ id: 2, label: "Second" },
			],
			(existing, next) => existing.id === next.id,
		);

		expect(result.map((ref) => ref.id)).toEqual([1, 2]);
	});
});

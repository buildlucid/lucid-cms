import { describe, expect, it } from "vitest";
import type { FilterState } from "@/hooks/useQueryState";
import { type FilterSectionPreset, isFilterPresetActive } from "./preset-state";

const pendingPreset: FilterSectionPreset = {
	key: "pending",
	label: "Pending review",
	filters: {
		status: { value: "pending", operator: "=" },
	},
};

const filters = (entries: Array<[string, FilterState]>) => new Map(entries);

describe("isFilterPresetActive", () => {
	it("matches only the exact preset filters and operators", () => {
		expect(
			isFilterPresetActive({
				currentFilters: filters([
					["status", { value: "pending", operator: "=" }],
				]),
				orFilterGroups: [],
				hasDraftRows: false,
				preset: pendingPreset,
			}),
		).toBe(true);

		expect(
			isFilterPresetActive({
				currentFilters: filters([
					["status", { value: "pending", operator: "!=" }],
				]),
				orFilterGroups: [],
				hasDraftRows: false,
				preset: pendingPreset,
			}),
		).toBe(false);
	});

	it("stops matching when filters are added or removed", () => {
		expect(
			isFilterPresetActive({
				currentFilters: filters([
					["status", { value: "pending", operator: "=" }],
					["target", { value: "production", operator: "=" }],
				]),
				orFilterGroups: [],
				hasDraftRows: false,
				preset: pendingPreset,
			}),
		).toBe(false);

		expect(
			isFilterPresetActive({
				currentFilters: filters([]),
				orFilterGroups: [],
				hasDraftRows: false,
				preset: pendingPreset,
			}),
		).toBe(false);
	});

	it("does not match while draft or grouped rows exist", () => {
		const currentFilters = filters([
			["status", { value: "pending", operator: "=" }],
		]);

		expect(
			isFilterPresetActive({
				currentFilters,
				orFilterGroups: [],
				hasDraftRows: true,
				preset: pendingPreset,
			}),
		).toBe(false);

		expect(
			isFilterPresetActive({
				currentFilters,
				orFilterGroups: [[{ key: "status", value: "pending", operator: "=" }]],
				hasDraftRows: false,
				preset: pendingPreset,
			}),
		).toBe(false);
	});
});

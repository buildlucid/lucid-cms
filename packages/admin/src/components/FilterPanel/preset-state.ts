import type {
	FilterState,
	FilterValue,
	OrFilterGroups,
} from "@/hooks/useQueryState/useQueryState";

export interface FilterPreset {
	key: string;
	label: string;
	/** Shown as a badge, such as the number of matching results. */
	count?: string | number;
	/** Shows a placeholder in place of the count. */
	loading?: boolean;
	/** The filters the preset applies, by filter key. */
	filters: Record<string, FilterState>;
}

export const isFilterValueEmpty = (value: FilterValue): boolean => {
	if (value === undefined) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.length === 0;
	return false;
};

const comparableFilterValue = (value: FilterValue): FilterValue => {
	if (Array.isArray(value)) return value.length === 1 ? value[0] : value;
	return value === "" ? undefined : value;
};

const filterValuesMatch = (left: FilterValue, right: FilterValue) => {
	const comparableLeft = comparableFilterValue(left);
	const comparableRight = comparableFilterValue(right);
	if (Array.isArray(comparableLeft) && Array.isArray(comparableRight)) {
		return (
			comparableLeft.length === comparableRight.length &&
			comparableLeft.every((value, index) => value === comparableRight[index])
		);
	}
	return comparableLeft === comparableRight;
};

const filterStatesMatch = (
	current: FilterState | undefined,
	expected: FilterState,
) => {
	if (!filterValuesMatch(current?.value, expected.value)) return false;
	return (current?.operator ?? "=") === (expected.operator ?? "=");
};

const isActiveFilterState = (state: FilterState) =>
	state.operator !== undefined || !isFilterValueEmpty(state.value);

export const isFilterPresetActive = (options: {
	currentFilters: ReadonlyMap<string, FilterState>;
	orFilterGroups: OrFilterGroups;
	hasDraftRows: boolean;
	preset: FilterPreset;
}) => {
	if (options.hasDraftRows || options.orFilterGroups.length > 0) return false;

	const currentFilters = Array.from(options.currentFilters).filter(
		([, state]) => isActiveFilterState(state),
	);
	const presetFilters = Object.entries(options.preset.filters).filter(
		([, state]) => isActiveFilterState(state),
	);

	if (currentFilters.length !== presetFilters.length) return false;

	return presetFilters.every(([key, expected]) =>
		filterStatesMatch(options.currentFilters.get(key), expected),
	);
};

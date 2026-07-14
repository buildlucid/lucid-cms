import {
	arrayFilter,
	booleanFilter,
	DEFAULT_PAGE,
	DEFAULT_PER_PAGE,
	numberFilter,
	textFilter,
} from "./codecs";
import type {
	FilterCodec,
	FilterState,
	FilterValue,
	OrFilterGroup,
	QueryFilterState,
	QueryStateModel,
	QueryStateOptions,
	QueryStateParams,
	QueryStateSchema,
} from "./types";

const FILTER_PARAM_REGEX = /^filter\[([^\]:]+)(?::([^\]]+))?\]$/;
const OR_FILTER_PARAM_REGEX =
	/^filter\[or\]\[(\d+)\]\[([^\]:]+)(?::([^\]]+))?\]$/;
const FILTER_DEFAULTS_CLEAR_PARAM = "filter[clear]";
const OR_FILTER_CLEAR_PARAM = "filter[or]";
const OWNED_PARAM_REGEX = /^(filter\[.*\]|sort|page|perPage)$/;

//* filters set programmatically for keys outside the schema fall back to an inferred codec
const inferCodec = (value: FilterValue): FilterCodec => {
	if (Array.isArray(value)) return arrayFilter();
	if (typeof value === "boolean") return booleanFilter();
	if (typeof value === "number") return numberFilter();
	return textFilter();
};

export const codecForKey = (
	schema: QueryStateSchema,
	key: string,
	value?: FilterValue,
): FilterCodec => schema.filters?.[key] ?? inferCodec(value);

const isFilterState = (
	value: FilterValue | FilterState,
): value is FilterState =>
	typeof value === "object" &&
	value !== null &&
	!Array.isArray(value) &&
	"value" in value;

const hasOwn = (value: object, key: string): boolean =>
	Object.hasOwn(value, key);

const createFilterState = (
	value: FilterValue,
	operator: string | undefined,
	operatorExplicit = false,
): QueryFilterState => ({
	value,
	...(operator !== undefined ? { operator } : {}),
	...(operatorExplicit ? { operatorExplicit } : {}),
});

/** Returns the canonical empty value for a filter codec. */
const emptyFilterValue = (codec: FilterCodec): FilterValue => {
	if (codec.type === "array") return codec.normalize([]);
	if (codec.type === "text") return codec.normalize("");
	return codec.normalize(undefined);
};

/** Clears top-level defaults while retaining sort and pagination defaults. */
const clearDefaultFilterState = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): QueryStateModel => ({
	...state,
	filters: Object.fromEntries(
		Object.entries(schema.filters ?? {}).map(([key, codec]) => [
			key,
			createFilterState(emptyFilterValue(codec), undefined),
		]),
	),
});

/** Whether at least one non-empty schema default has been explicitly cleared. */
const hasClearedFilterDefaults = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): boolean =>
	Object.entries(schema.filters ?? {}).some(([key, codec]) => {
		const defaultValue = codec.normalize(codec.defaultValue);
		const current = state.filters[key];
		if (!codec.isEmpty(defaultValue) && codec.isEmpty(current?.value))
			return true;
		return (
			codec.defaultOperator !== undefined &&
			current?.operator !== codec.defaultOperator &&
			codec.isEmpty(current?.value)
		);
	});

/** Keeps OR group normalization readable when empty groups are discarded. */
const isOrFilterGroupEmpty = (group: OrFilterGroup): boolean =>
	group.length === 0;

/** Normalizes programmatic OR groups through the same codecs as normal filters. */
const normalizeOrFilterGroups = (
	groups: OrFilterGroup[] | undefined,
	schema: QueryStateSchema,
): OrFilterGroup[] => {
	if (!groups) return [];

	return groups
		.map((group) =>
			group
				.map((condition) => {
					const codec = codecForKey(schema, condition.key, condition.value);
					const value = codec.normalize(condition.value);
					return {
						key: condition.key,
						value,
						...(condition.operator !== undefined
							? { operator: condition.operator }
							: {}),
					};
				})
				.filter((condition) => {
					const codec = codecForKey(schema, condition.key, condition.value);
					return !codec.isEmpty(condition.value);
				}),
		)
		.filter((group) => !isOrFilterGroupEmpty(group));
};

const filterValuesEqual = (a: FilterValue, b: FilterValue): boolean => {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, index) => String(item) === String(b[index]));
	}
	return a === b;
};

/** Compares grouped OR filters without treating object identity as state changes. */
const orFilterGroupsEqual = (
	a: OrFilterGroup[],
	b: OrFilterGroup[],
): boolean => {
	if (a.length !== b.length) return false;

	return a.every((leftGroup, groupIndex) => {
		const rightGroup = b[groupIndex];
		if (!rightGroup || leftGroup.length !== rightGroup.length) return false;

		return leftGroup.every((leftCondition, conditionIndex) => {
			const rightCondition = rightGroup[conditionIndex];
			if (!rightCondition) return false;
			return (
				leftCondition.key === rightCondition.key &&
				leftCondition.operator === rightCondition.operator &&
				filterValuesEqual(leftCondition.value, rightCondition.value)
			);
		});
	});
};

export const defaultQueryState = (
	schema: QueryStateSchema,
): QueryStateModel => {
	const state: QueryStateModel = {
		filters: {},
		orFilterGroups: normalizeOrFilterGroups(
			schema.defaultOrFilterGroups,
			schema,
		),
		sorts: {},
		pagination: {
			page: schema.pagination?.defaultPage ?? DEFAULT_PAGE,
			perPage: schema.pagination?.defaultPerPage ?? DEFAULT_PER_PAGE,
		},
	};
	for (const [key, codec] of Object.entries(schema.filters ?? {})) {
		state.filters[key] = {
			value: codec.normalize(codec.defaultValue),
			operator: codec.defaultOperator,
		};
	}
	for (const [key, codec] of Object.entries(schema.sorts ?? {})) {
		state.sorts[key] = codec.defaultValue;
	}
	return state;
};

export const parseSearchIntoState = (
	search: string,
	schema: QueryStateSchema,
): QueryStateModel => {
	const params = new URLSearchParams(search);
	const defaults = defaultQueryState(schema);
	const state = params.has(FILTER_DEFAULTS_CLEAR_PARAM)
		? clearDefaultFilterState(defaults, schema)
		: defaults;
	const orFilterGroups = new Map<number, OrFilterGroup>();
	let hasOrFilterParams = params.has(OR_FILTER_CLEAR_PARAM);

	for (const [param, raw] of params.entries()) {
		const orMatch = param.match(OR_FILTER_PARAM_REGEX);
		if (orMatch) {
			hasOrFilterParams = true;
			const groupIndex = Number.parseInt(orMatch[1] ?? "", 10);
			const key = orMatch[2];
			if (Number.isNaN(groupIndex) || !key) continue;

			const codec = schema.filters?.[key];
			if (!codec) continue;

			const group = orFilterGroups.get(groupIndex) ?? [];
			group.push({
				key,
				value: codec.normalize(codec.parse(raw)),
				...(orMatch[3] !== undefined ? { operator: orMatch[3] } : {}),
			});
			orFilterGroups.set(groupIndex, group);
			continue;
		}

		const match = param.match(FILTER_PARAM_REGEX);
		if (!match) continue;
		const codec = schema.filters?.[match[1]];
		if (!codec) continue;
		state.filters[match[1]] = createFilterState(
			codec.normalize(codec.parse(raw)),
			match[2] ?? codec.defaultOperator,
			match[2] !== undefined,
		);
	}
	if (hasOrFilterParams) {
		state.orFilterGroups = Array.from(orFilterGroups.entries())
			.sort(([left], [right]) => left - right)
			.map(([, group]) => group)
			.filter((group) => group.length > 0);
	}

	//* a present sort param fully defines the sorts - absence means schema defaults
	if (params.has("sort")) {
		for (const key of Object.keys(state.sorts)) {
			state.sorts[key] = undefined;
		}
		const sortRaw = params.get("sort") ?? "";
		for (const entry of sortRaw.split(",")) {
			if (!entry) continue;
			if (entry.startsWith("-")) state.sorts[entry.slice(1)] = "desc";
			else state.sorts[entry] = "asc";
		}
	}

	const page = Number.parseInt(params.get("page") ?? "", 10);
	if (!Number.isNaN(page)) state.pagination.page = page;
	const perPage = Number.parseInt(params.get("perPage") ?? "", 10);
	if (!Number.isNaN(perPage)) state.pagination.perPage = perPage;

	return state;
};

const serializeSorts = (sorts: QueryStateModel["sorts"]): string =>
	Object.entries(sorts)
		.filter(([, direction]) => direction !== undefined)
		.map(([key, direction]) => (direction === "asc" ? key : `-${key}`))
		.join(",");

const filterParamKey = (key: string, operator: string | undefined): string =>
	operator ? `filter[${key}:${operator}]` : `filter[${key}]`;

/** Builds the nested query param key used by grouped OR filters. */
const orFilterParamKey = (
	groupIndex: number,
	key: string,
	operator: string | undefined,
): string =>
	operator
		? `filter[or][${groupIndex}][${key}:${operator}]`
		: `filter[or][${groupIndex}][${key}]`;

/**
 * Builds the search string written to storage (URL or memory). Values equal to
 * the schema defaults are omitted so absence always means default. Explicit
 * operators are preserved in the param key, even when the value is empty or the
 * operator matches the codec default, so committed operator UI state survives a
 * round-trip. Params the hook does not own are preserved.
 */
export const stateToStorageSearch = (
	state: QueryStateModel,
	schema: QueryStateSchema,
	currentSearch: string,
): string => {
	const params = new URLSearchParams(currentSearch);
	for (const key of Array.from(new Set(params.keys()))) {
		if (OWNED_PARAM_REGEX.test(key)) params.delete(key);
	}
	const clearedFilterDefaults = hasClearedFilterDefaults(state, schema);
	if (clearedFilterDefaults) params.set(FILTER_DEFAULTS_CLEAR_PARAM, "");

	for (const [key, filter] of Object.entries(state.filters)) {
		const codec = codecForKey(schema, key, filter.value);
		const defaultValue =
			clearedFilterDefaults && schema.filters?.[key]
				? emptyFilterValue(codec)
				: schema.filters?.[key]
					? codec.normalize(codec.defaultValue)
					: undefined;

		const withOperator =
			filter.operator !== undefined &&
			(filter.operatorExplicit || filter.operator !== codec.defaultOperator);
		if (codec.equals(filter.value, defaultValue) && !withOperator) continue;

		params.set(
			filterParamKey(key, withOperator ? filter.operator : undefined),
			codec.serialize(filter.value) ?? "",
		);
	}

	const defaultOrFilterGroups = defaultQueryState(schema).orFilterGroups;
	if (!orFilterGroupsEqual(state.orFilterGroups, defaultOrFilterGroups)) {
		if (state.orFilterGroups.length === 0) {
			params.set(OR_FILTER_CLEAR_PARAM, "");
		}
		for (const [groupIndex, group] of (state.orFilterGroups ?? []).entries()) {
			for (const condition of group) {
				const codec = codecForKey(schema, condition.key, condition.value);
				const serialized = codec.serialize(condition.value);
				if (serialized === undefined) continue;
				params.set(
					orFilterParamKey(groupIndex, condition.key, condition.operator),
					serialized,
				);
			}
		}
	}

	const sortRaw = serializeSorts(state.sorts);
	const defaultSortRaw = serializeSorts(defaultQueryState(schema).sorts);
	if (sortRaw !== defaultSortRaw) params.set("sort", sortRaw);

	const defaultPage = schema.pagination?.defaultPage ?? DEFAULT_PAGE;
	const defaultPerPage = schema.pagination?.defaultPerPage ?? DEFAULT_PER_PAGE;
	if (state.pagination.page !== defaultPage)
		params.set("page", String(state.pagination.page));
	if (state.pagination.perPage !== defaultPerPage)
		params.set("perPage", String(state.pagination.perPage));

	return params.toString();
};

//* builds the API query string - identical for URL and memory modes
export const buildQueryString = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): string => {
	const params = new URLSearchParams();

	for (const [key, filter] of Object.entries(state.filters)) {
		const codec = codecForKey(schema, key, filter.value);
		const serialized = codec.serialize(filter.value);
		if (serialized === undefined) continue;
		params.set(filterParamKey(key, filter.operator), serialized);
	}

	for (const [groupIndex, group] of (state.orFilterGroups ?? []).entries()) {
		for (const condition of group) {
			const codec = codecForKey(schema, condition.key, condition.value);
			const serialized = codec.serialize(condition.value);
			if (serialized === undefined) continue;
			params.set(
				orFilterParamKey(groupIndex, condition.key, condition.operator),
				serialized,
			);
		}
	}

	const sortRaw = serializeSorts(state.sorts);
	if (sortRaw) params.set("sort", sortRaw);

	params.set("page", String(state.pagination.page));
	params.set("perPage", String(state.pagination.perPage));

	return params.toString();
};

export const statesEqual = (
	a: QueryStateModel,
	b: QueryStateModel,
): boolean => {
	const aFilterKeys = Object.keys(a.filters);
	const bFilterKeys = Object.keys(b.filters);
	if (aFilterKeys.length !== bFilterKeys.length) return false;
	for (const key of aFilterKeys) {
		const left = a.filters[key];
		const right = b.filters[key];
		if (!right) return false;
		if (left.operator !== right.operator) return false;
		if (left.operatorExplicit !== right.operatorExplicit) return false;
		if (!filterValuesEqual(left.value, right.value)) return false;
	}
	if (!orFilterGroupsEqual(a.orFilterGroups ?? [], b.orFilterGroups ?? []))
		return false;

	const aSortKeys = Object.keys(a.sorts);
	const bSortKeys = Object.keys(b.sorts);
	if (aSortKeys.length !== bSortKeys.length) return false;
	for (const key of aSortKeys) {
		if (a.sorts[key] !== b.sorts[key]) return false;
	}

	return (
		a.pagination.page === b.pagination.page &&
		a.pagination.perPage === b.pagination.perPage
	);
};

export const applyParams = (
	state: QueryStateModel,
	schema: QueryStateSchema,
	params: QueryStateParams,
	options?: QueryStateOptions,
): QueryStateModel => {
	const next: QueryStateModel = {
		filters: { ...state.filters },
		orFilterGroups: state.orFilterGroups ?? [],
		sorts: { ...state.sorts },
		pagination: { ...state.pagination },
	};

	if (params.filters) {
		for (const [key, input] of Object.entries(params.filters)) {
			const current = state.filters[key];
			let value: FilterValue;
			let hasOperatorInput = false;
			let operatorInput: string | undefined;
			if (isFilterState(input)) {
				value = input.value;
				hasOperatorInput = hasOwn(input, "operator");
				operatorInput = input.operator;
			} else {
				value = input;
			}
			const codec = codecForKey(schema, key, value);
			const normalized = codec.normalize(value);
			const operator = hasOperatorInput
				? operatorInput
				: (current?.operator ?? codec.defaultOperator);
			const operatorExplicit = hasOperatorInput
				? operatorInput !== undefined
				: (current?.operatorExplicit ?? false);

			if (
				!schema.filters?.[key] &&
				codec.isEmpty(normalized) &&
				!operatorExplicit
			) {
				delete next.filters[key];
				continue;
			}
			next.filters[key] = createFilterState(
				normalized,
				operator,
				operatorExplicit,
			);
		}
	}

	if (params.orFilterGroups !== undefined) {
		next.orFilterGroups = normalizeOrFilterGroups(
			params.orFilterGroups,
			schema,
		);
	}

	if (params.sorts) {
		if (options?.singleSort) {
			for (const key of Object.keys(next.sorts)) {
				next.sorts[key] = undefined;
			}
			const [key] = Object.keys(params.sorts);
			if (key !== undefined) next.sorts[key] = params.sorts[key];
		} else {
			for (const [key, direction] of Object.entries(params.sorts)) {
				next.sorts[key] = direction;
			}
		}
	}

	//* pagination is replaced as a group - omitted fields reset to schema defaults
	if (params.pagination) {
		next.pagination = {
			page:
				params.pagination.page ??
				schema.pagination?.defaultPage ??
				DEFAULT_PAGE,
			perPage:
				params.pagination.perPage ??
				schema.pagination?.defaultPerPage ??
				DEFAULT_PER_PAGE,
		};
	}

	return next;
};

export const resetFiltersState = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): QueryStateModel => {
	const defaults = defaultQueryState(schema);
	return {
		...state,
		filters: defaults.filters,
		orFilterGroups: defaults.orFilterGroups,
	};
};

export const clearFiltersState = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): QueryStateModel => ({
	...clearDefaultFilterState(state, schema),
	orFilterGroups: [],
});

export const clearFilterState = (
	state: QueryStateModel,
	schema: QueryStateSchema,
	key: string,
): QueryStateModel => {
	const next: QueryStateModel = { ...state, filters: { ...state.filters } };
	const codec = schema.filters?.[key];
	if (codec) {
		next.filters[key] = createFilterState(
			codec.normalize(codec.defaultValue),
			codec.defaultOperator,
		);
	} else {
		delete next.filters[key];
	}
	return next;
};

export const hasFiltersApplied = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): boolean => {
	for (const [key, filter] of Object.entries(state.filters)) {
		const codec = codecForKey(schema, key, filter.value);
		if (!codec.isEmpty(filter.value)) return true;
	}
	if ((state.orFilterGroups ?? []).length > 0) return true;
	return false;
};

export const hasDefaultFiltersApplied = (
	state: QueryStateModel,
	schema: QueryStateSchema,
): boolean => {
	const defaults = defaultQueryState(schema);
	if (!orFilterGroupsEqual(state.orFilterGroups, defaults.orFilterGroups))
		return false;

	for (const [key, filter] of Object.entries(state.filters)) {
		const codec = codecForKey(schema, key, filter.value);
		const defaultValue = schema.filters?.[key]
			? codec.normalize(codec.defaultValue)
			: undefined;
		if (filter.operator !== codec.defaultOperator) return false;
		if (filter.operatorExplicit) return false;
		if (!codec.equals(filter.value, defaultValue)) return false;
	}
	return true;
};

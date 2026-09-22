import {
	type Accessor,
	batch,
	createEffect,
	createMemo,
	createSignal,
	untrack,
} from "solid-js";
import { DEFAULT_PAGE } from "./codecs";
import {
	applyParams,
	buildQueryString,
	clearFilterState,
	clearFiltersState,
	codecForKey,
	filtersAreDefault,
	hasFiltersApplied,
	parseSearchIntoState,
	resetFiltersState,
	statesEqual,
	stateToStorageSearch,
} from "./engine";
import type {
	FilterMap,
	FilterState,
	FilterStateMap,
	FilterValue,
	OrFilterGroups,
	QueryStateModel,
	QueryStateOptions,
	QueryStateParams,
	QueryStateSchema,
	QueryStateStorageAdapter,
	SortDirection,
	SortMap,
} from "./types";

export interface CreateQueryStateConfig {
	schema?: QueryStateSchema;
	options?: QueryStateOptions;
	adapter: QueryStateStorageAdapter;
}

const normalizeSearch = (search: string): string =>
	new URLSearchParams(search).toString();

const toPublicFilterState = (
	filter: QueryStateModel["filters"][string],
): FilterState => ({
	value: filter.value,
	...(filter.operator !== undefined ? { operator: filter.operator } : {}),
});

/**
 * The query state primitive behind `useQueryState`, with a pluggable storage
 * adapter.
 */
const createQueryState = (config: CreateQueryStateConfig) => {
	const options = config.options;
	const adapter = config.adapter;

	const [getSchema, setSchemaSignal] = createSignal<QueryStateSchema>(
		config.schema ?? {},
	);

	//* initial hydration is synchronous - state always reflects storage + defaults
	const initialSearch = normalizeSearch(untrack(() => adapter.search()));
	const [getState, setState] = createSignal<QueryStateModel>(
		parseSearchIntoState(initialSearch, untrack(getSchema)),
	);
	const [getReady, setReady] = createSignal(options?.awaitSchema !== true);

	//* so the hook's own writes are not mistaken for navigation
	let lastSyncedSearch = initialSearch;

	const commit = (next: QueryStateModel) => {
		const schema = untrack(getSchema);
		batch(() => {
			if (!statesEqual(next, untrack(getState))) setState(next);
		});
		const currentSearch = normalizeSearch(untrack(() => adapter.search()));
		const nextSearch = normalizeSearch(
			stateToStorageSearch(next, schema, currentSearch),
		);
		lastSyncedSearch = nextSearch;
		if (nextSearch !== currentSearch) adapter.write(nextSearch);
	};

	//* external navigation (back/forward, links) rehydrates state from storage
	createEffect(() => {
		const search = normalizeSearch(adapter.search());
		if (search === lastSyncedSearch) return;
		lastSyncedSearch = search;
		const parsed = parseSearchIntoState(search, untrack(getSchema));
		if (!statesEqual(parsed, untrack(getState))) setState(parsed);
	});

	const setParams = (params: QueryStateParams) => {
		commit(applyParams(untrack(getState), untrack(getSchema), params, options));
	};

	const setSchema = (schema: QueryStateSchema) => {
		batch(() => {
			const merged = { ...untrack(getSchema), ...schema };
			setSchemaSignal(merged);

			//* rehydrate so storage values for newly registered fields are picked up
			const search = normalizeSearch(untrack(() => adapter.search()));
			const parsed = parseSearchIntoState(search, merged);
			const reconciledSearch = normalizeSearch(
				stateToStorageSearch(parsed, merged, search),
			);
			lastSyncedSearch = reconciledSearch;
			if (!statesEqual(parsed, untrack(getState))) setState(parsed);
			if (reconciledSearch !== search) adapter.write(reconciledSearch);

			if (!untrack(getReady)) setReady(true);
		});
	};

	const filters: Accessor<FilterMap> = createMemo(
		() =>
			new Map(
				Object.entries(getState().filters).map(([key, filter]) => [
					key,
					filter.value,
				]),
			),
	);
	const filterStates: Accessor<FilterStateMap> = createMemo(
		() =>
			new Map(
				Object.entries(getState().filters).map(([key, filter]) => [
					key,
					toPublicFilterState(filter),
				]),
			),
	);
	const orFilterGroups: Accessor<OrFilterGroups> = createMemo(() =>
		(getState().orFilterGroups ?? []).map((group) =>
			group.map((condition) => ({ ...condition })),
		),
	);
	const sorts: Accessor<SortMap> = createMemo(
		() => new Map(Object.entries(getState().sorts)),
	);
	const paginationAccessor = createMemo(() => getState().pagination);
	const queryString = createMemo(() =>
		buildQueryString(getState(), getSchema()),
	);
	const hasFiltersAppliedMemo = createMemo(() =>
		hasFiltersApplied(getState(), getSchema()),
	);
	const filtersAreDefaultMemo = createMemo(() =>
		filtersAreDefault(getState(), getSchema()),
	);

	return {
		/** Filter values by key. */
		filters,
		/** Filter values and operators by key. */
		filterStates,
		orFilterGroups,
		getFilter: (key: string) => {
			const filter = getState().filters[key];
			return filter ? toPublicFilterState(filter) : undefined;
		},
		sorts,
		pagination: paginationAccessor,
		/** The state as an API query string. */
		queryString,
		/** False until `setSchema` is called, when `awaitSchema` is set. */
		ready: getReady,

		/** Updates filters, sorts and pagination in one go. */
		setParams,
		setFilter: (key: string, value: FilterValue | FilterState) => {
			setParams({ filters: { [key]: value } });
		},
		/** Replaces all filters and returns to the first page. */
		replaceFilters: (filters: NonNullable<QueryStateParams["filters"]>) => {
			const state = untrack(getState);
			const schema = untrack(getSchema);
			const cleared = clearFiltersState(state, schema);
			commit(
				applyParams(
					cleared,
					schema,
					{
						filters,
						pagination: {
							page: schema.pagination?.defaultPage ?? DEFAULT_PAGE,
							perPage: state.pagination.perPage,
						},
					},
					options,
				),
			);
		},
		setFilterOperator: (key: string, operator: string | undefined) => {
			const state = untrack(getState);
			const schema = untrack(getSchema);
			const current = state.filters[key];
			const codec = codecForKey(schema, key, current?.value);
			const value = current?.value ?? codec.normalize(codec.defaultValue);
			const filters = { ...state.filters };
			if (
				operator === undefined &&
				!schema.filters?.[key] &&
				codec.isEmpty(value)
			) {
				delete filters[key];
			} else {
				filters[key] = {
					value,
					...(operator !== undefined ? { operator } : {}),
					...(operator !== undefined ? { operatorExplicit: true } : {}),
				};
			}
			commit({
				...state,
				filters,
			});
		},
		clearFilter: (key: string) => {
			commit(clearFilterState(untrack(getState), untrack(getSchema), key));
		},
		/** Clears all filters, keeping any the schema gives a default value. */
		clearFilters: () => {
			commit(clearFiltersState(untrack(getState), untrack(getSchema)));
		},
		/** Sets all filters back to the schema defaults. */
		resetFilters: () => {
			commit(resetFiltersState(untrack(getState), untrack(getSchema)));
		},
		setOrFilterGroups: (groups: OrFilterGroups) => {
			setParams({ orFilterGroups: groups });
		},
		clearOrFilterGroups: () => {
			setParams({ orFilterGroups: [] });
		},

		setSort: (key: string, direction: SortDirection | undefined) => {
			setParams({ sorts: { [key]: direction } });
		},
		setPage: (page: number) => {
			const state = untrack(getState);
			commit({ ...state, pagination: { ...state.pagination, page } });
		},
		setPerPage: (perPage: number) => {
			const state = untrack(getState);
			const schema = untrack(getSchema);
			commit({
				...state,
				pagination: {
					page: schema.pagination?.defaultPage ?? DEFAULT_PAGE,
					perPage,
				},
			});
		},

		/** True when any filter has a value. */
		hasFiltersApplied: hasFiltersAppliedMemo,
		/** True when the filters match the schema defaults. */
		filtersAreDefault: filtersAreDefaultMemo,
		/** Adds to the schema, such as once a collection's fields have loaded. */
		setSchema,
	};
};

export type QueryStateResponse = ReturnType<typeof createQueryState>;

export default createQueryState;

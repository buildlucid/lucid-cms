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
	codecForKey,
	hasDefaultFiltersApplied,
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
 * The storage-agnostic query state primitive. Canonical state is a single
 * typed model; the adapter decides whether it is mirrored to the URL or kept
 * in memory. Use useQueryState (index.ts) from components.
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

	//* tracks the last search string this hook wrote (or hydrated from) so its
	//* own storage writes are not mistaken for external navigation
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
	const hasDefaultFiltersAppliedMemo = createMemo(() =>
		hasDefaultFiltersApplied(getState(), getSchema()),
	);

	return {
		filters,
		filterStates,
		getFilter: (key: string) => {
			const filter = getState().filters[key];
			return filter ? toPublicFilterState(filter) : undefined;
		},
		sorts,
		pagination: paginationAccessor,
		queryString,
		ready: getReady,

		setParams,
		setFilter: (key: string, value: FilterValue | FilterState) => {
			setParams({ filters: { [key]: value } });
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
		resetFilters: () => {
			commit(resetFiltersState(untrack(getState), untrack(getSchema)));
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
					//* changing the page size restarts from the first page
					page: schema.pagination?.defaultPage ?? DEFAULT_PAGE,
					perPage,
				},
			});
		},

		hasFiltersApplied: hasFiltersAppliedMemo,
		hasDefaultFiltersApplied: hasDefaultFiltersAppliedMemo,
		setSchema,
	};
};

export type QueryStateResponse = ReturnType<typeof createQueryState>;

export default createQueryState;

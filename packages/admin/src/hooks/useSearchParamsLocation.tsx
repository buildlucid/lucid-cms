import {
	createEffect,
	createMemo,
	createSignal,
	type Accessor,
} from "solid-js";
import { useLocation, useSearchParams } from "@solidjs/router";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 10;

export type FilterValues =
	| string
	| number
	| (string | number)[]
	| boolean
	| undefined;

export type FilterSchema = Record<
	string,
	{ value: FilterValues; type: "text" | "number" | "boolean" | "array" }
>;

export interface SearchParamsSchema {
	filters?: FilterSchema;
	sorts?: Record<string, "asc" | "desc" | undefined>;
	pagination?: { page?: number; perPage?: number };
}

interface SearchParamsConfig {
	singleSort?: boolean;
	manualSettled?: boolean;
}

export type FilterMap = Map<string, FilterValues>;
export type SortMap = Map<string, "asc" | "desc" | undefined>;

export type SearchParamsResponse = {
	getFilters: Accessor<FilterMap>;
	getSorts: Accessor<SortMap>;
	getPagination: Accessor<{
		page: number;
		perPage: number;
	}>;
	getSettled: Accessor<boolean>;
	getQueryString: Accessor<string>;
	setParams: (params: {
		filters?: {
			[key: string]: FilterValues;
		};
		sorts?: SearchParamsSchema["sorts"];
		pagination?: SearchParamsSchema["pagination"];
	}) => void;
	setFilterSchema: (filters: SearchParamsSchema["filters"]) => void;
	hasFiltersApplied: Accessor<boolean>;
	resetFilters: () => void;
	hasDefaultFiltersApplied: Accessor<boolean>;
};

const useSearchParamsLocation = (
	schemaDefaults?: SearchParamsSchema,
	options?: SearchParamsConfig,
): SearchParamsResponse => {
	const location = useLocation();
	const [, setSearchParams] = useSearchParams();

	const [getSchema, setSchema] = createSignal(schemaDefaults);

	const [getSettled, setSettled] = createSignal(false);
	const [getSettledTimeout, setSettledTimeout] =
		createSignal<ReturnType<typeof setTimeout>>();
	const [getPrevQueryString, setPrevQueryString] = createSignal("");
	const [getQueryString, setQueryString] = createSignal("");
	const [getInitialParams, setInitialParams] = createSignal(false);
	const [getFilters, setFilters] = createSignal<FilterMap>(new Map());
	const [getSorts, setSorts] = createSignal<SortMap>(new Map());
	const [getPagination, setPagination] = createSignal({
		page: DEFAULT_PAGE,
		perPage: DEFAULT_PER_PAGE,
	});

	const filterValueToString = (value?: FilterValues) => {
		if (value === undefined) return undefined;
		if (typeof value === "boolean") return value ? "1" : "0";
		if (Array.isArray(value)) return value.length ? value.join(",") : undefined;
		return value.toString();
	};

	const setLocation = (params: {
		filters?: {
			[key: string]: FilterValues;
		};
		sorts?: SearchParamsSchema["sorts"];
		pagination?: SearchParamsSchema["pagination"];
	}) => {
		const searchParams = new URLSearchParams(location.search);
		const schema = getSchema();

		// Merge filters into search params
		if (params.filters) {
			for (const [key, value] of Object.entries(params.filters)) {
				const filterVal = filterValueToString(value);
				if (filterVal) {
					searchParams.set(`filter[${key}]`, filterVal);
				} else {
					searchParams.delete(`filter[${key}]`);
				}
			}
		}

		// Merge sorts into search params
		// sort=test,test2,-test3
		if (params.sorts) {
			const sorts: {
				key: string;
				value: "asc" | "desc";
				raw: string;
			}[] = [];

			if (options?.singleSort) {
				// first sort from params.sort
				const key = Object.keys(params.sorts)[0];
				const sort = params.sorts[key];
				if (sort) {
					sorts.push({
						key: key,
						value: sort,
						raw: sort === "asc" ? key : `-${key}`,
					});
				}
			} else {
				const currentSorts = searchParams.get("sort");

				// add current sorts to array
				if (currentSorts) {
					const currentSortArr = currentSorts.split(",");

					for (const sort of currentSortArr) {
						const sortKey = sort.startsWith("-") ? sort.slice(1) : sort;
						if (schema?.sorts && schema?.sorts[sortKey] !== undefined) {
							if (sort.startsWith("-")) {
								sorts.push({
									key: sort.slice(1),
									value: "desc",
									raw: sort,
								});
							} else {
								sorts.push({
									key: sort,
									value: "asc",
									raw: sort,
								});
							}
						}
					}
				}

				for (const [key, value] of Object.entries(params.sorts)) {
					if (value === undefined) {
						const index = sorts.findIndex((sort) => sort.key === key);
						if (index !== -1) {
							sorts.splice(index, 1);
						}
					} else {
						const index = sorts.findIndex((sort) => sort.key === key);
						if (index !== -1) {
							sorts[index].value = value;
							sorts[index].raw = value === "asc" ? key : `-${key}`;
						} else {
							sorts.push({
								key,
								value,
								raw: value === "asc" ? key : `-${key}`,
							});
						}
					}
				}
			}

			// set sorts
			const sortsStr = sorts.map((sort) => sort.raw).join(",");
			if (sortsStr) {
				searchParams.set("sort", sortsStr);
			} else {
				searchParams.delete("sort");
			}
		}

		// Merge pagination into search params
		if (params.pagination) {
			if (params.pagination.page) {
				searchParams.set("page", params.pagination.page.toString());
			} else {
				searchParams.delete("page");
			}
			if (params.pagination.perPage) {
				searchParams.set("perPage", params.pagination.perPage.toString());
			} else {
				searchParams.delete("perPage");
			}
		}

		// Set search params
		const prev = new URLSearchParams(location.search);
		const nextObj: Record<string, string | undefined> = {};
		for (const [k, v] of searchParams.entries()) nextObj[k] = v;
		for (const [k] of prev.entries())
			if (!searchParams.has(k)) nextObj[k] = undefined;
		setSearchParams(nextObj, { scroll: false });
	};
	const setStateFromLocation = (searchParams: URLSearchParams) => {
		// on location change - update filters and sorts based on search params
		const filters = new Map<string, FilterValues>();
		const sorts = new Map<string, "asc" | "desc" | undefined>();
		const schema = getSchema();

		// --------------------
		// Set maps
		if (schema?.filters) {
			for (const [key] of Object.entries(schema.filters)) {
				filters.set(key, undefined);
			}
		}
		if (schema?.sorts) {
			for (const [key] of Object.entries(schema.sorts)) {
				sorts.set(key, undefined);
			}
		}

		// --------------------
		// Set filters
		for (const [key, value] of searchParams.entries()) {
			if (key.startsWith("filter[")) {
				const filterKey = key.slice(7, -1); // remove filter[ and ]

				// If schema filter value is boolean, convert to boolean
				if (schema?.filters && schema.filters[filterKey]?.type === "boolean") {
					if (value === "1") filters.set(filterKey, true);
					else if (value === "0") filters.set(filterKey, false);
					else filters.set(filterKey, undefined);
				}
				// if schema filter value type is array, convert to array
				else if (
					schema?.filters &&
					schema.filters[filterKey]?.type === "array"
				) {
					const asArray = value.split(",");
					// if values are numbers, convert to numbers
					const asNumber = asArray.map((val) => {
						if (!Number.isNaN(Number(val))) return Number(val);
						return val;
					});
					filters.set(filterKey, asNumber);
				} else if (
					schema?.filters &&
					schema.filters[filterKey]?.type === "text"
				) {
					filters.set(filterKey, value);
				} else if (
					schema?.filters &&
					schema.filters[filterKey]?.type === "number"
				) {
					const singleValue = Number.isNaN(Number(value))
						? value
						: Number(value);
					filters.set(filterKey, singleValue);
				}
			}
		}

		// --------------------
		// Set sorts
		const sortStr = searchParams.get("sort");
		if (sortStr) {
			// split by comma
			const sortArr = sortStr.split(",");
			for (let i = 0; i < sortArr.length; i++) {
				const sort = sortArr[i];
				if (sort.startsWith("-")) {
					const sortKey = sort.slice(1);
					sorts.set(sortKey, "desc");
				} else {
					sorts.set(sort, "asc");
				}
			}
		}

		// --------------------
		// Set pagination
		const page = searchParams.get("page");
		const perPage = searchParams.get("perPage");
		if (page) {
			setPagination((prev) => ({ ...prev, page: Number(page) }));
		} else {
			setPagination((prev) => ({ ...prev, page: DEFAULT_PAGE }));
		}
		if (perPage) {
			setPagination((prev) => ({ ...prev, perPage: Number(perPage) }));
		} else {
			setPagination((prev) => ({ ...prev, perPage: DEFAULT_PER_PAGE }));
		}

		// --------------------
		// Set signals
		setFilters(filters);
		setSorts(sorts);
	};
	const buildQueryString = () => {
		// from filters and sorts, build a query string
		const searchParams = new URLSearchParams();

		// Set filters
		for (const [key, value] of getFilters()) {
			const filterVal = filterValueToString(value);
			if (filterVal !== undefined) {
				searchParams.set(`filter[${key}]`, filterVal);
			}
		}

		// Set sorts
		const sorts = getSorts();
		let sortsStr = "";
		for (const [key, value] of sorts) {
			if (value === "asc") {
				sortsStr += `${key},`;
			} else if (value === "desc") {
				sortsStr += `-${key},`;
			}
		}

		if (sortsStr) {
			sortsStr = sortsStr.slice(0, -1); // remove last comma
			searchParams.set("sort", sortsStr);
		}

		// Set pagination
		const pagination = getPagination();
		if (pagination.page) {
			searchParams.set("page", pagination.page.toString());
		}
		if (pagination.perPage) {
			searchParams.set("perPage", pagination.perPage.toString());
		}

		setPrevQueryString(getQueryString());
		setQueryString(searchParams.toString());
	};

	const setDefaultParams = () => {
		if (getInitialParams()) return;
		setInitialParams(true);

		const searchParams = new URLSearchParams(location.search);
		const schema = getSchema();

		let hasFilters = false;
		if (schema?.filters) {
			for (const [key] of Object.entries(schema.filters)) {
				if (searchParams.has(`filter[${key}]`)) {
					hasFilters = true;
					break;
				}
			}
		}

		let hasSorts = false;
		if (schema?.sorts) {
			if (searchParams.has("sort")) {
				hasSorts = true;
			}
		}

		let hasPagination = false;
		if (schema?.pagination) {
			if (searchParams.has("page") || searchParams.has("perPage")) {
				hasPagination = true;
			}
		}

		// if either is false
		if (hasFilters && hasSorts && hasPagination) return;

		// convert schema filters to object of values;
		const filters: Record<string, FilterValues> = {};
		if (schema?.filters) {
			for (const [key, value] of Object.entries(schema.filters)) {
				filters[`${key}`] = value.value;
			}
		}

		// Find first sort with value
		const sorts = Object.entries(schema?.sorts || {}).reduce<
			Record<string, "asc" | "desc" | undefined>
		>((acc, [key, value]) => {
			if (value) {
				acc[key] = value;
			}
			return acc;
		}, {});

		setLocation({
			filters: !hasFilters ? filters : undefined,
			sorts: !hasSorts ? sorts : undefined,
			pagination: !hasPagination ? schema?.pagination : undefined,
		});
	};

	const resetFilters = () => {
		const filters = getFilters();
		const filterValues: {
			[key: string]: FilterValues;
		} = {};
		for (const [key] of filters) {
			filterValues[key] = schemaDefaults?.filters?.[key]?.value;
		}
		setLocation({ filters: filterValues });
	};

	// sync filters, sort by location and build query string
	createEffect(() => {
		if (options?.manualSettled !== true) setSettled(false);
		setDefaultParams();

		const searchParams = new URLSearchParams(location.search);
		setStateFromLocation(searchParams);

		buildQueryString();
	});

	// handle query string settled
	createEffect(() => {
		const currentQueryString = getQueryString();

		if (currentQueryString !== getPrevQueryString()) {
			if (options?.manualSettled) return;

			if (getSettledTimeout()) {
				clearTimeout(getSettledTimeout());
			}

			const timeout = setTimeout(() => {
				setSettled(true);
			}, 1);

			setSettledTimeout(timeout);
			setPrevQueryString(currentQueryString);
		}
	});

	// Util memos
	const hasFiltersApplied = createMemo(() => {
		const filters = getFilters();
		for (const inst of filters) {
			if (inst[1] !== undefined) return true;
		}
		return false;
	});
	const hasDefaultFiltersApplied = createMemo(() => {
		const filters = getFilters();
		for (const [key, currentValue] of filters) {
			const target = schemaDefaults?.filters?.[key];
			if (!target) continue;
			if (target.type === "text") {
				const left =
					currentValue === undefined || currentValue === ""
						? ""
						: String(currentValue);
				const right =
					target.value === undefined || target.value === ""
						? ""
						: String(target.value);
				if (left !== right) return false;
			} else if (target.type === "boolean") {
				const left =
					currentValue === "" || currentValue === undefined
						? undefined
						: currentValue;
				if (left !== target.value) return false;
			} else if (target.type === "array") {
				const toArray = (val: FilterValues): (string | number)[] => {
					if (val === "" || val === undefined) return [];
					if (Array.isArray(val)) return val;
					return [val as string | number];
				};
				const leftArr = toArray(currentValue);
				const rightArr = toArray(target.value);
				if (leftArr.length !== rightArr.length) return false;
				for (let i = 0; i < leftArr.length; i++) {
					if (String(leftArr[i]) !== String(rightArr[i])) return false;
				}
			} else {
				if (currentValue !== target.value) return false;
			}
		}
		return true;
	});

	return {
		getFilters,
		getSorts,
		getPagination,
		getSettled,
		getQueryString,
		setParams: setLocation,
		setFilterSchema: (filters: SearchParamsSchema["filters"]) => {
			setSchema((prev) => ({ ...prev, filters }));
			setTimeout(() => {
				setSettled(true);
			}, 1);
		},

		hasFiltersApplied,
		resetFilters,
		hasDefaultFiltersApplied,
	};
};

export default useSearchParamsLocation;

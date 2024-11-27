import { createSignal, onMount } from "solid-js";
import {
	DEFAULT_PAGE,
	DEFAULT_PER_PAGE,
	type SearchParamsSchema,
	type FilterMap,
	type SortMap,
	type FilterValues,
	type SearchParamsResponse,
} from "./useSearchParamsLocation";

const useSearchParamsState = (
	schemaDefaults?: SearchParamsSchema,
	options?: {
		singleSort?: boolean;
	},
): SearchParamsResponse => {
	const [getSchema, setSchema] = createSignal(schemaDefaults);
	const [getQueryString, setQueryString] = createSignal("");
	const [getFilters, setFilters] = createSignal<FilterMap>(new Map());
	const [getSorts, setSorts] = createSignal<SortMap>(new Map());
	const [getPagination, setPagination] = createSignal({
		page: DEFAULT_PAGE,
		perPage: DEFAULT_PER_PAGE,
	});
	const [getHasFiltersApplied, setHasFiltersApplied] = createSignal(false);
	const [getSettled, setSettled] = createSignal(false);

	const filterValueToString = (value?: FilterValues) => {
		if (value === undefined) return undefined;
		if (typeof value === "boolean") return value ? "1" : "0";
		if (Array.isArray(value)) return value.length ? value.join(",") : undefined;
		return value.toString();
	};
	const setParams = (params: {
		filters?: { [key: string]: FilterValues };
		sorts?: SearchParamsSchema["sorts"];
		pagination?: SearchParamsSchema["pagination"];
	}) => {
		const currentFilters = getFilters();
		const currentSorts = getSorts();
		const currentPagination = getPagination();

		const newFilters = new Map(currentFilters);
		const newSorts = new Map(currentSorts);
		const newPagination = { ...currentPagination };

		if (params.filters) {
			for (const [key, value] of Object.entries(params.filters)) {
				if (value === "") newFilters.set(key, undefined);
				else newFilters.set(key, value);
			}
		}
		if (params.sorts) {
			if (options?.singleSort) {
				const key = Object.keys(params.sorts)[0];
				const sort = params.sorts[key];
				newSorts.forEach((_, key) => {
					newSorts.set(key, undefined);
				});
				newSorts.set(key, sort);
			} else {
				for (const [key, value] of Object.entries(params.sorts)) {
					newSorts.set(key, value);
				}
			}
		}
		if (params.pagination) {
			if (params.pagination.page) {
				newPagination.page = params.pagination.page;
			} else {
				newPagination.page = DEFAULT_PAGE;
			}
			if (params.pagination.perPage) {
				newPagination.perPage = params.pagination.perPage;
			} else {
				newPagination.perPage = DEFAULT_PER_PAGE;
			}
		}

		setFilters(newFilters);
		setSorts(newSorts);
		setPagination(newPagination);
		buildQueryString();
		updateHasFiltersApplied();
		setSettled(true);
	};
	const setDefaultParams = () => {
		const schema = getSchema();

		if (schema?.filters) {
			const filterMap = new Map();
			for (const [key, value] of Object.entries(schema.filters)) {
				if (value.value === "") {
					filterMap.set(key, undefined);
				} else if (value.type === "array") {
					filterMap.set(key, [value.value]);
				} else filterMap.set(key, value.value);
			}
			setFilters(filterMap);
		}
		if (schema?.sorts) {
			const sortMap = new Map();
			for (const [key, value] of Object.entries(schema.sorts)) {
				sortMap.set(key, value);
			}
			setSorts(sortMap);
		}
		if (schema?.pagination) {
			setPagination({
				page: schema.pagination.page || DEFAULT_PAGE,
				perPage: schema.pagination.perPage || DEFAULT_PER_PAGE,
			});
		}
		buildQueryString();
		updateHasFiltersApplied();
		setSettled(true);
	};
	const buildQueryString = () => {
		const searchParams = new URLSearchParams();
		const filterMap = getFilters();
		const sortMap = getSorts();
		const pagination = getPagination();

		// Set filters
		for (const [key, value] of filterMap) {
			const filterVal = filterValueToString(value);
			if (filterVal !== undefined) {
				searchParams.set(`filter[${key}]`, filterVal);
			}
		}

		//Set sorts
		let sortsStr = "";
		for (const [key, value] of sortMap) {
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
		if (pagination.page) {
			searchParams.set("page", pagination.page.toString());
		}
		if (pagination.perPage) {
			searchParams.set("perPage", pagination.perPage.toString());
		}

		setQueryString(searchParams.toString());
	};
	const updateHasFiltersApplied = () => {
		for (const [key, value] of getFilters()) {
			if (value !== undefined) {
				setHasFiltersApplied(true);
				break;
			}
			setHasFiltersApplied(false);
		}
	};
	const resetFilters = () => {
		const filters = getFilters();
		const filterMap = new Map();
		for (const [key] of filters) {
			filterMap.set(key, undefined);
		}
		setFilters(filterMap);
		buildQueryString();
		updateHasFiltersApplied();
		setSettled(true);
	};

	onMount(() => {
		setDefaultParams();
	});

	return {
		getFilters,
		getSorts,
		getPagination,
		getQueryString,
		setParams,
		hasFiltersApplied: getHasFiltersApplied,
		resetFilters: resetFilters,
		getSettled,
		setFilterSchema: (filters: SearchParamsSchema["filters"]) => {
			setSchema((prev) => ({ ...prev, filters }));
			setTimeout(() => {
				setSettled(true);
			}, 1);
		},
	};
};

export default useSearchParamsState;

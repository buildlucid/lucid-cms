import { CLIENT_BASE_PATH } from "../constants.js";
import type {
	FilterObject,
	FilterValue,
	QueryFilters,
	SortValue,
} from "../types/contracts.js";

/**
 * Keeps generic query serialization predictable by narrowing values to URL-safe primitives.
 */
const isPrimitive = (
	value: unknown,
): value is string | number | boolean | null | undefined =>
	value === null ||
	value === undefined ||
	typeof value === "string" ||
	typeof value === "number" ||
	typeof value === "boolean";

/**
 * Normalizes Lucid filter values into the string format expected in query params.
 */
const serializeFilterValue = (value: FilterValue): string => {
	if (value === null) return "";
	if (Array.isArray(value)) return value.join(",");
	return String(value);
};

/**
 * Keeps Lucid filter key formatting in one place before writing into the search params.
 */
const appendFilter = (
	params: URLSearchParams,
	key: string,
	filter: FilterObject,
) => {
	const suffix = filter.operator ? `:${filter.operator}` : "";
	params.set(`filter[${key}${suffix}]`, serializeFilterValue(filter.value));
};

/**
 * Detects Lucid's filter leaf shape so nested filter objects can be flattened safely.
 */
const isFilterObject = (value: unknown): value is FilterObject => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const keys = Object.keys(value);

	return (
		keys.length > 0 &&
		keys.every((key) => key === "value" || key === "operator") &&
		"value" in value
	);
};

/**
 * Recursively flattens nested filter objects into Lucid's dotted query param key format.
 */
const flattenFilterBranch = (
	value: Record<string, unknown>,
	path: string[],
	flattened: Record<string, FilterObject>,
) => {
	for (const [key, branchValue] of Object.entries(value)) {
		if (branchValue === undefined || branchValue === null) continue;

		if (isFilterObject(branchValue)) {
			flattened[[...path, key].join(".")] = branchValue;
			continue;
		}

		if (typeof branchValue === "object" && !Array.isArray(branchValue)) {
			flattenFilterBranch(
				branchValue as Record<string, unknown>,
				[...path, key],
				flattened,
			);
		}
	}
};

/**
 * Converts DX-friendly nested filter objects into the flat query param keys the API expects.
 */
const flattenFilters = (
	filters: QueryFilters,
): Record<string, FilterObject> => {
	const flattened: Record<string, FilterObject> = {};

	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined || value === null) continue;

		if (isFilterObject(value)) {
			flattened[key] = value;
			continue;
		}

		if (typeof value === "object" && !Array.isArray(value)) {
			flattenFilterBranch(value as Record<string, unknown>, [key], flattened);
		}
	}

	return flattened;
};

/**
 * Converts structured sort descriptors into Lucid's comma-separated sort syntax.
 */
const appendSort = (
	params: URLSearchParams,
	sort: Array<{
		key: string;
		value: SortValue;
	}>,
) => {
	if (sort.length === 0) return;

	params.set(
		"sort",
		sort
			.map((item) => (item.value === "desc" ? `-${item.key}` : item.key))
			.join(","),
	);
};

/**
 * Serializes include and exclude lists using Lucid's comma-separated query convention.
 */
const appendList = (
	params: URLSearchParams,
	key: "include" | "exclude",
	value: string[],
) => {
	if (value.length === 0) return;
	params.set(key, value.join(","));
};

/**
 * Builds a Lucid-compatible query string so request code can work with structured query objects.
 */
export const serializeQuery = (query?: Record<string, unknown>): string => {
	if (!query) return "";

	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value === undefined) continue;

		if (key === "filter" && value && typeof value === "object") {
			for (const [filterKey, filterValue] of Object.entries(
				flattenFilters(value as QueryFilters),
			)) {
				if (!filterValue) continue;
				appendFilter(params, filterKey, filterValue);
			}
			continue;
		}

		if (key === "sort" && Array.isArray(value)) {
			appendSort(
				params,
				value as Array<{
					key: string;
					value: SortValue;
				}>,
			);
			continue;
		}

		if ((key === "include" || key === "exclude") && Array.isArray(value)) {
			appendList(params, key, value.map(String));
			continue;
		}

		if (Array.isArray(value)) {
			params.set(key, value.map(String).join(","));
			continue;
		}

		if (isPrimitive(value)) {
			params.set(key, value === null ? "" : String(value));
		}
	}

	const queryString = params.toString();
	return queryString ? `?${queryString}` : "";
};

/**
 * Removes trailing slashes once so endpoint resolution stays consistent across requests.
 */
export const normalizeBaseUrl = (baseUrl: string): string =>
	baseUrl.replace(/\/+$/, "");

/**
 * Accepts either a site URL or a full client API URL and resolves the final client base path.
 */
export const resolveClientBaseUrl = (baseUrl: string): string => {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

	if (
		normalizedBaseUrl === CLIENT_BASE_PATH ||
		normalizedBaseUrl.endsWith(CLIENT_BASE_PATH)
	) {
		return normalizedBaseUrl;
	}

	return `${normalizedBaseUrl}${CLIENT_BASE_PATH}`;
};

/**
 * Wraps segment encoding so resource paths are built consistently in one place.
 */
export const encodePathSegment = (value: string): string =>
	encodeURIComponent(value);

/**
 * Encodes media keys safely while preserving slash-delimited path segments.
 */
export const encodePathPreservingSlashes = (value: string): string =>
	value
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

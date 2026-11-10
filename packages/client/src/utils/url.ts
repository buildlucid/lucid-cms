import type { SortDirection } from "@lucidcms/types";
import { CONTENT_BASE_PATH } from "../constants.js";
import flattenFilters, { type FlatFilterCondition } from "./flatten-filters.js";

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Writes one condition as `filter[key:operator]`. Lists repeat the parameter for each value, so
 * values can contain commas, and null is sent as an empty value.
 */
const appendCondition = (
	params: URLSearchParams,
	prefix: string,
	condition: FlatFilterCondition,
) => {
	const suffix = condition.operator ? `:${condition.operator}` : "";
	const name = `${prefix}[${condition.key}${suffix}]`;

	if (!Array.isArray(condition.value)) {
		params.append(
			name,
			condition.value === null ? "" : String(condition.value),
		);
		return;
	}
	if (condition.value.length === 0) {
		params.append(name, "");
		return;
	}
	for (const value of condition.value) {
		params.append(name, String(value));
	}
};

/** One filter object is sent as `filter[...]`; a list is sent as `filter[or][index][...]` groups, where any may match. */
const appendFilters = (params: URLSearchParams, filter: unknown) => {
	if (Array.isArray(filter)) {
		for (const [index, group] of filter.filter(isRecord).entries()) {
			for (const condition of flattenFilters(group)) {
				appendCondition(params, `filter[or][${index}]`, condition);
			}
		}
		return;
	}
	if (isRecord(filter)) {
		for (const condition of flattenFilters(filter)) {
			appendCondition(params, "filter", condition);
		}
	}
};

/**
 * Converts structured sort descriptors into Lucid's comma-separated sort syntax.
 */
const appendSort = (
	params: URLSearchParams,
	sort: Array<{
		key: string;
		direction: SortDirection;
	}>,
) => {
	if (sort.length === 0) return;

	params.set(
		"sort",
		sort
			.map((item) => (item.direction === "desc" ? `-${item.key}` : item.key))
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

		if (key === "filter") {
			appendFilters(params, value);
			continue;
		}

		if (key === "sort" && Array.isArray(value)) {
			appendSort(
				params,
				value as Array<{
					key: string;
					direction: SortDirection;
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
const normalizeBaseUrl = (baseUrl: string): string =>
	baseUrl.replace(/\/+$/, "");

/**
 * Accepts either a site URL or a full content API URL and resolves the final content base path.
 */
export const resolveClientBaseUrl = (baseUrl: string): string => {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

	if (
		normalizedBaseUrl === CONTENT_BASE_PATH ||
		normalizedBaseUrl.endsWith(CONTENT_BASE_PATH)
	) {
		return normalizedBaseUrl;
	}

	return `${normalizedBaseUrl}${CONTENT_BASE_PATH}`;
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

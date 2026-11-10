import z, { type ZodType } from "zod";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type {
	FilterOperator,
	FilterValue,
	QueryParamFilterGroups,
	QueryParamFilters,
} from "../../../types/query-params.js";
import { LucidError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import parseFormattedQuery from "./parse-formatted-query.js";

const buildSort = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const sort = queryObject.sort;
	if (!sort) return undefined;
	return sort.split(",").map((sort) => {
		if (sort.startsWith("-")) {
			return {
				key: sort.slice(1),
				direction: "desc",
			};
		}
		return {
			key: sort,
			direction: "asc",
		};
	});
};

type FilterParams = Record<string, string[]>;

const filterPattern = /^filter\[([^\]:]+):?([^\]]*)\]$/;
const filterOrPattern = /^filter\[or\]\[(\d+)\]\[([^\]:]+):?([^\]]*)\]$/;

/**
 * Reads repeated values for `in`/`not-in`; other operators use the first value. Commas stay
 * literal. Empty values become null for `is`/`is-not` and controller-specified nullable fields.
 */
const parseFilterValue = (props: {
	name: string;
	values: string[];
	operator: string;
	nullableFields?: string[];
}): FilterValue => {
	if (props.operator === "in" || props.operator === "not-in") {
		return props.values;
	}

	const value = props.values[0] ?? "";
	const nullable =
		props.operator === "is" ||
		props.operator === "is-not" ||
		props.nullableFields?.includes(props.name) === true;

	return value === "" && nullable ? null : value;
};

const toOperator = (operator: string): FilterOperator | undefined =>
	operator === "" ? undefined : (operator as FilterOperator);

const buildFilter = (query: FilterParams, nullableFields?: string[]) => {
	const filters: QueryParamFilters = {};

	for (const [key, values] of Object.entries(query)) {
		const match = key.match(filterPattern);
		if (!match) continue;

		const [, name, operator = ""] = match;
		if (!name) continue;

		filters[name] = {
			value: parseFilterValue({ name, values, operator, nullableFields }),
			operator: toOperator(operator),
		};
	}

	return filters;
};

/** Parses grouped OR params while preserving numeric group order. */
const buildFilterOr = (query: FilterParams, nullableFields?: string[]) => {
	const groups = new Map<number, QueryParamFilterGroups[number]>();

	for (const [key, values] of Object.entries(query)) {
		const match = key.match(filterOrPattern);
		if (!match) continue;

		const [, groupIndexRaw, name, operator = ""] = match;
		if (!groupIndexRaw || !name) continue;

		const groupIndex = Number.parseInt(groupIndexRaw, 10);
		if (Number.isNaN(groupIndex)) continue;

		const group = groups.get(groupIndex) ?? [];
		group.push({
			key: name,
			value: parseFilterValue({ name, values, operator, nullableFields }),
			operator: toOperator(operator),
		});
		groups.set(groupIndex, group);
	}

	const filterGroups = Array.from(groups.entries())
		.sort(([left], [right]) => left - right)
		.map(([, group]) => group)
		.filter((group) => group.length > 0);

	return filterGroups.length > 0 ? filterGroups : undefined;
};

const buildPage = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const page = queryObject.page;
	if (!page) return constants.query.page;
	return Number.parseInt(page, 10);
};

const buildPerPage = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const perPage = queryObject.perPage;
	if (!perPage) return constants.query.perPage;
	return Number.parseInt(perPage, 10);
};

const buildInclude = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const include = queryObject.include;
	if (!include) return undefined;
	return include.split(",");
};

const buildExclude = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const exclude = queryObject.exclude;
	if (!exclude) return undefined;
	return exclude.split(",");
};

const addRemainingQuery = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const remainingQuery = Object.fromEntries(
		Object.entries(queryObject).filter(
			([key]) =>
				!["include", "exclude", "filter", "sort", "page", "perPage"].includes(
					key,
				),
		),
	);
	return remainingQuery;
};

const buildFormattedQuery = async <T extends ZodType>(
	c: LucidHonoContext,
	schema: T,
	options?: {
		nullableFields?: string[];
	},
): Promise<z.infer<T>> => {
	const querySchema = schema ?? z.object({});

	const queryParams = c.req.query();
	const filterParams = c.req.queries();

	const formattedQueryObject = {
		sort: buildSort(queryParams),
		filter: buildFilter(filterParams, options?.nullableFields),
		filterOr: buildFilterOr(filterParams, options?.nullableFields),
		include: buildInclude(queryParams),
		exclude: buildExclude(queryParams),
		page: buildPage(queryParams),
		perPage: buildPerPage(queryParams),
		...addRemainingQuery(queryParams),
	};

	const validateResult = await parseFormattedQuery(
		querySchema,
		formattedQueryObject,
	);

	if (!validateResult.success) {
		throw new LucidError({
			type: "validation",
			message: copy("server:core.requests.query.validation.message"),
			zod: validateResult.error,
		});
	}

	const parsedQuery = validateResult.data as Record<string, unknown>;

	return {
		...parsedQuery,
		...(formattedQueryObject.filterOr !== undefined
			? { filterOr: formattedQueryObject.filterOr }
			: {}),
	} as z.infer<T>;
};

export default buildFormattedQuery;

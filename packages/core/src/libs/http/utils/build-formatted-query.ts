import T from "../../../translations/index.js";
import z, { type ZodType } from "zod/v4";
import constants from "../../../constants/constants.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import type {
	QueryParamFilters,
	FilterOperator,
	FilterValue,
} from "../../../types/query-params.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const buildSort = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const sort = queryObject.sort;
	if (!sort) return undefined;
	return sort.split(",").map((sort) => {
		if (sort.startsWith("-")) {
			return {
				key: sort.slice(1),
				value: "desc",
			};
		}
		return {
			key: sort,
			value: "asc",
		};
	});
};

const buildFilter = (query: unknown, nullableFields?: string[]) => {
	return Object.entries(
		query as Record<string, string>,
	).reduce<QueryParamFilters>((acc, [key, value]) => {
		if (key.includes("filter[")) {
			const match = key.match(/filter\[([^\]:]+):?([^\]]*)\]/);
			if (!match) return acc;
			const [, name, operator] = match;
			if (!name) return acc;

			let processedValue: FilterValue = value.includes(",")
				? value.split(",")
				: value;

			if (nullableFields?.includes(name) && processedValue === "") {
				processedValue = null;
			}

			acc[name] = {
				value: processedValue,
				operator:
					operator === "" || operator === undefined
						? undefined
						: (operator as FilterOperator),
			};
		}
		return acc;
	}, {});
};

const buildPage = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const page = queryObject.page;
	if (!page) return constants.query.page;
	return Number.parseInt(page);
};

const buildPerPage = (query: unknown) => {
	const queryObject = query as Record<string, string>;
	const perPage = queryObject.perPage;
	if (!perPage) return constants.query.perPage;
	return Number.parseInt(perPage);
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

	const formattedQueryObject = {
		sort: buildSort(queryParams),
		filter: buildFilter(queryParams, options?.nullableFields),
		include: buildInclude(queryParams),
		exclude: buildExclude(queryParams),
		page: buildPage(queryParams),
		perPage: buildPerPage(queryParams),
		...addRemainingQuery(queryParams),
	};

	const validateResult = await querySchema.safeParseAsync(formattedQueryObject);

	if (!validateResult.success) {
		throw new LucidAPIError({
			type: "validation",
			message: T("validation_query_error_message"),
			zod: validateResult.error,
		});
	}

	return validateResult.data;
};

export default buildFormattedQuery;

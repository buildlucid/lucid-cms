import T from "../../../translations/index.js";
import z, { type ZodTypeAny } from "zod";
import constants from "../../../constants/constants.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import type { FastifyRequest } from "fastify";
import type {
	QueryParams,
	QueryParamFilters,
	FilterOperator,
} from "../../../types/query-params.js";

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

const buildFilter = (query: unknown) => {
	return Object.entries(
		query as Record<string, string>,
	).reduce<QueryParamFilters>((acc, [key, value]) => {
		if (key.includes("filter[")) {
			const match = key.match(/filter\[([^\]:]+):?([^\]]*)\]/);
			if (!match) return acc;

			const [, name, operator] = match;
			if (!name) return acc;

			acc[name] = {
				value: value.includes(",") ? value.split(",") : value,
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

const validateQuery =
	(schema: ZodTypeAny) => async (request: FastifyRequest) => {
		const querySchema = z.object({
			query: schema ?? z.object({}),
		});

		const validateResult = await querySchema.safeParseAsync({
			query: {
				sort: buildSort(request.query),
				filter: buildFilter(request.query),
				include: buildInclude(request.query),
				exclude: buildExclude(request.query),
				page: buildPage(request.query),
				perPage: buildPerPage(request.query),
				...addRemainingQuery(request.query),
			},
		});

		if (!validateResult.success) {
			throw new LucidAPIError({
				type: "validation",
				message: T("validation_query_error_message"),
				zod: validateResult.error,
			});
		}

		request.query = validateResult.data.query as QueryParams;
	};

export default validateQuery;

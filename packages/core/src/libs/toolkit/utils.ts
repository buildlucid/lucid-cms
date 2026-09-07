import type z from "zod";
import constants from "../../constants/constants.js";
import type {
	ContentGetMultipleQueryParams,
	ContentGetSingleQueryParams,
} from "../../schemas/documents.js";
import type {
	QueryFilters,
	QueryParamFilters,
} from "../../types/query-params.js";
import decodeError from "../../utils/errors/decode-error.js";
import flattenDocumentFilters from "../../utils/helpers/flatten-document-filters.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";

type PaginatedQuery = {
	page?: number;
	perPage?: number;
};

type DocumentQuery = {
	filter?: QueryFilters | QueryFilters[];
};

type ResolvedServiceResponse<T> = Awaited<ServiceResponse<T>>;

type ToolkitServiceErrorCopy = {
	key: string;
	defaultMessage: string;
};

type ToolkitServiceErrorConfig = {
	name?: ToolkitServiceErrorCopy;
	message: ToolkitServiceErrorCopy;
};

type ToolkitServiceOptions<T, TInput> = ToolkitServiceErrorConfig &
	(
		| {
				schema: z.ZodType<TInput>;
				input: unknown;
				handler: (input: TInput) => ServiceResponse<T>;
		  }
		| {
				schema?: never;
				input?: never;
				handler: () => ServiceResponse<T>;
		  }
	);

type ServiceDocumentFilter = NonNullable<
	| ContentGetSingleQueryParams["filter"]
	| ContentGetMultipleQueryParams["filter"]
>;
type ServiceDocumentFilterOr = NonNullable<
	| ContentGetSingleQueryParams["filterOr"]
	| ContentGetMultipleQueryParams["filterOr"]
>;

type NormalizedDocumentFilters = {
	filter?: ServiceDocumentFilter;
	filterOr?: ServiceDocumentFilterOr;
};

/** Converts one flattened filter map into an AND group for filterOr. */
const toFilterGroup = (
	filters?: QueryParamFilters,
): ServiceDocumentFilterOr[number] =>
	Object.entries(filters ?? {}).map(([key, filter]) => ({
		key,
		...filter,
	})) as ServiceDocumentFilterOr[number];

/** Maps toolkit filter shorthand to the service filter/filterOr shape. */
const normalizeToolkitDocumentFilters = (
	filters?: QueryFilters | QueryFilters[],
): NormalizedDocumentFilters => {
	if (!filters) return {};

	if (!Array.isArray(filters)) {
		return {
			filter: flattenDocumentFilters(filters) as ServiceDocumentFilter,
		};
	}

	const filterOr = filters
		.map((filterGroup) => toFilterGroup(flattenDocumentFilters(filterGroup)))
		.filter((filterGroup) => filterGroup.length > 0);

	return filterOr.length > 0 ? { filterOr } : {};
};

/** Applies Lucid's default pagination when toolkit callers omit it. */
export const normalizePaginatedQuery = <T extends PaginatedQuery>(
	query?: T,
): Omit<T, "page" | "perPage"> & { page: number; perPage: number } => {
	const normalizedQuery = query ?? ({} as T);

	return {
		...normalizedQuery,
		page: normalizedQuery.page ?? constants.query.page,
		perPage: normalizedQuery.perPage ?? constants.query.perPage,
	};
};

/** Flattens nested document filters so toolkit calls match the internal service query shape. */
export const normalizeDocumentQuery = <T extends DocumentQuery>(
	query?: T,
): Omit<T, "filter"> & NormalizedDocumentFilters => {
	const normalizedQuery = query ?? ({} as T);
	const { filter, ...restQuery } = normalizedQuery;

	return {
		...restQuery,
		...normalizeToolkitDocumentFilters(filter),
	};
};

/** Applies pagination defaults and flattens nested document filters for toolkit document queries. */
export const normalizePaginatedDocumentQuery = <
	T extends PaginatedQuery & DocumentQuery,
>(
	query?: T,
): Omit<T, "filter" | "page" | "perPage"> & {
	filter?: ServiceDocumentFilter;
	filterOr?: ServiceDocumentFilterOr;
	page: number;
	perPage: number;
} => {
	const normalizedQuery = query ?? ({} as T);
	const { filter, page, perPage, ...restQuery } = normalizedQuery;

	return {
		...restQuery,
		...normalizeToolkitDocumentFilters(filter),
		page: page ?? constants.query.page,
		perPage: perPage ?? constants.query.perPage,
	};
};

/** Clones optional query objects so toolkit services can pass a stable shape downstream. */
export const normalizeQuery = <T extends object>(query?: T): T =>
	({ ...(query ?? {}) }) as T;

/** Validates optional input, passes parsed values to the handler and converts unexpected errors to service results. */
export const runToolkitService = async <T, TInput = never>(
	options: ToolkitServiceOptions<T, TInput>,
): ServiceResponse<T> => {
	try {
		if (options.schema) {
			const parsed = await options.schema.safeParseAsync(options.input);
			if (!parsed.success) {
				return {
					error: { type: "validation", status: 400, zod: parsed.error },
					data: undefined,
				};
			}

			return await options.handler(parsed.data);
		}

		return await options.handler();
	} catch (error) {
		if (error instanceof Error) {
			const decodedError = decodeError(error);

			return {
				error: {
					type: "basic",
					name: options.name
						? copy(`server:${options.name.key}`, {
								defaultMessage: options.name.defaultMessage,
							})
						: copy("server:core.errors.default.name", {
								defaultMessage: decodedError.name,
							}),
					message: copy(`server:${options.message.key}`, {
						defaultMessage: options.message.defaultMessage,
					}),
					status: decodedError.status,
					code: decodedError.code,
					errors: undefined,
				},
				data: undefined,
			} satisfies ResolvedServiceResponse<T>;
		}

		return {
			error: {
				type: "basic",
				name: options.name
					? copy(`server:${options.name.key}`, {
							defaultMessage: options.name.defaultMessage,
						})
					: copy("server:core.errors.default.name", {
							defaultMessage: constants.errors.name,
						}),
				message: copy(`server:${options.message.key}`, {
					defaultMessage: options.message.defaultMessage,
				}),
				status: constants.errors.status,
			},
			data: undefined,
		} satisfies ResolvedServiceResponse<T>;
	}
};

import constants from "../../constants/constants.js";
import type {
	ClientGetMultipleQueryParams,
	ClientGetSingleQueryParams,
} from "../../schemas/documents.js";
import type {
	QueryFilters,
	QueryParamFilters,
} from "../../types/query-params.js";
import decodeError from "../../utils/errors/decode-error.js";
import flattenDocumentFilters from "../../utils/helpers/flatten-document-filters.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import type { ToolkitTenantOptions } from "./types.js";

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

type ServiceDocumentFilter = NonNullable<
	ClientGetSingleQueryParams["filter"] | ClientGetMultipleQueryParams["filter"]
>;
type ServiceDocumentFilterOr = NonNullable<
	| ClientGetSingleQueryParams["filterOr"]
	| ClientGetMultipleQueryParams["filterOr"]
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

/** Creates a per-call toolkit context when a tenant override is supplied. */
export const withToolkitTenant = (
	context: ServiceContext,
	options?: ToolkitTenantOptions,
): ServiceContext => {
	if (options?.tenantKey === undefined) return context;

	return {
		...context,
		request: {
			...context.request,
			tenantKey: options.tenantKey,
		},
	};
};

/** Converts unexpected exceptions into standard Lucid service error values. */
export const runToolkitService = async <T>(
	callback: () => ServiceResponse<T>,
	errorConfig: ToolkitServiceErrorConfig,
): ServiceResponse<T> => {
	try {
		const response = await callback();

		if (response.error || response.data !== undefined) {
			return response;
		}

		return {
			error: {
				type: "basic",
				name: errorConfig.name
					? copy(`server:${errorConfig.name.key}`, {
							defaultMessage: errorConfig.name.defaultMessage,
						})
					: undefined,
				message: copy(`server:${errorConfig.message.key}`, {
					defaultMessage: errorConfig.message.defaultMessage,
				}),
				status: 500,
			},
			data: undefined,
		} satisfies ResolvedServiceResponse<T>;
	} catch (error) {
		if (error instanceof Error) {
			const decodedError = decodeError(error);

			return {
				error: {
					type: "basic",
					name: errorConfig.name
						? copy(`server:${errorConfig.name.key}`, {
								defaultMessage: errorConfig.name.defaultMessage,
							})
						: copy("server:core.errors.default.name", {
								defaultMessage: decodedError.name,
							}),
					message: copy(`server:${errorConfig.message.key}`, {
						defaultMessage: errorConfig.message.defaultMessage,
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
				name: errorConfig.name
					? copy(`server:${errorConfig.name.key}`, {
							defaultMessage: errorConfig.name.defaultMessage,
						})
					: copy("server:core.errors.default.name", {
							defaultMessage: constants.errors.name,
						}),
				message: copy(`server:${errorConfig.message.key}`, {
					defaultMessage: errorConfig.message.defaultMessage,
				}),
				status: constants.errors.status,
			},
			data: undefined,
		} satisfies ResolvedServiceResponse<T>;
	}
};

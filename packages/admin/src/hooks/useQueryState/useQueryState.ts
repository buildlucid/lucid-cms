import { useLocation, useNavigate } from "@solidjs/router";
import { createMemoryStorageAdapter } from "./adapters";
import createQueryState, { type QueryStateResponse } from "./createQueryState";
import type {
	QueryStateOptions,
	QueryStateSchema,
	QueryStateStorageAdapter,
} from "./types";

//* navigates with the full search string, as setSearchParams drops empty params
const createUrlStorageAdapter = (): QueryStateStorageAdapter => {
	const location = useLocation();
	const navigate = useNavigate();

	return {
		search: () =>
			location.search.startsWith("?")
				? location.search.slice(1)
				: location.search,
		write: (search) => {
			navigate(
				`${location.pathname}${search ? `?${search}` : ""}${location.hash}`,
				{ scroll: false },
			);
		},
	};
};

export interface UseQueryStateConfig extends QueryStateOptions {
	/** Where the state is stored. @default "url" */
	mode?: "url" | "memory";
	schema?: QueryStateSchema;
}

/**
 * Manages filters, sorting and pagination for a list, stored in the URL by
 * default.
 *
 * @example
 * ```tsx
 * import { useQuery } from "@tanstack/solid-query";
 * import { sort, textFilter, useQueryState } from "@lucidcms/admin/hooks";
 * import { request } from "@lucidcms/admin/services";
 *
 * const queryState = useQueryState({
 * 	schema: {
 * 		filters: { from: textFilter({ defaultOperator: "contains" }) },
 * 		sorts: { createdAt: sort({ defaultValue: "desc" }) },
 * 	},
 * });
 *
 * const redirects = useQuery(() => ({
 * 	queryKey: ["redirects", queryState.queryString()],
 * 	queryFn: () => request({ url: `/lucid/api/v1/redirects?${queryState.queryString()}` }),
 * }));
 * ```
 */
const useQueryState = (
	config: UseQueryStateConfig = {},
): QueryStateResponse => {
	const adapter =
		config.mode === "memory"
			? createMemoryStorageAdapter()
			: createUrlStorageAdapter();

	return createQueryState({
		schema: config.schema,
		options: { singleSort: config.singleSort, awaitSchema: config.awaitSchema },
		adapter,
	});
};

export {
	arrayFilter,
	booleanFilter,
	DEFAULT_PAGE,
	DEFAULT_PER_PAGE,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "./codecs";

export type { QueryStateResponse } from "./createQueryState";

export type {
	FilterMap,
	FilterState,
	FilterStateMap,
	FilterValue,
	OrFilterCondition,
	OrFilterGroup,
	OrFilterGroups,
	QueryFilterSchema,
	QueryStateOptions,
	QueryStateParams,
	QueryStateSchema,
	SortDirection,
	SortMap,
} from "./types";

export default useQueryState;

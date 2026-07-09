import { useLocation, useNavigate } from "@solidjs/router";
import { createMemoryStorageAdapter } from "./adapters";
import createQueryState, { type QueryStateResponse } from "./createQueryState";
import type {
	QueryStateOptions,
	QueryStateSchema,
	QueryStateStorageAdapter,
} from "./types";

//* reads/writes browser search params - back/forward rehydrates state via the
//* reactive location.search, while params the hook does not own are preserved.
//* writes navigate with the full search string rather than setSearchParams,
//* which silently drops empty-string params (used for operator-only filters)
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

export interface UseQueryStateConfig {
	mode: "url" | "memory";
	schema?: QueryStateSchema;
	options?: QueryStateOptions;
}

const useQueryState = (config: UseQueryStateConfig): QueryStateResponse => {
	const adapter =
		config.mode === "memory"
			? createMemoryStorageAdapter()
			: createUrlStorageAdapter();

	return createQueryState({
		schema: config.schema,
		options: config.options,
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

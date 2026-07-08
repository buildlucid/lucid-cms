import { useLocation, useSearchParams } from "@solidjs/router";
import { createMemoryStorageAdapter } from "./adapters";
import createQueryState, { type QueryStateResponse } from "./createQueryState";
import type {
	QueryStateOptions,
	QueryStateSchema,
	QueryStateStorageAdapter,
} from "./types";

//* reads/writes browser search params - back/forward rehydrates state via the
//* reactive location.search, while params the hook does not own are preserved
const createUrlStorageAdapter = (): QueryStateStorageAdapter => {
	const location = useLocation();
	const [, setSearchParams] = useSearchParams();

	return {
		search: () =>
			location.search.startsWith("?")
				? location.search.slice(1)
				: location.search,
		write: (search) => {
			const next = new URLSearchParams(search);
			const current = new URLSearchParams(location.search);

			const params: Record<string, string | undefined> = {};
			for (const [key, value] of next.entries()) params[key] = value;
			for (const [key] of current.entries()) {
				if (!next.has(key)) params[key] = undefined;
			}

			setSearchParams(params, { scroll: false });
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
	QueryFilterSchema,
	QueryStateOptions,
	QueryStateParams,
	QueryStateSchema,
	SortDirection,
	SortMap,
} from "./types";

export default useQueryState;

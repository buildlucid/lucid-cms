import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AgentRoutine, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
}

/** Gets routines. Without a query string it gets every routine, sorted by name. */
const useGetRoutines = (params?: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams ?? {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [...queryKeys.agent.routines(), queryKey(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<AgentRoutine[]>>({
				url: "/lucid/api/v1/agent/routines",
				query: queryParams().queryString
					? queryParams()
					: { perPage: -1, sort: { name: "asc" } },
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetRoutines;

import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AgentRun, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import { isRunWorking } from "@/utils/agent-chat";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
}

/** Gets a routine's runs, refetching while one is still working. */
const useGetRoutineRuns = (
	params: QueryHook<QueryParams> & { id: Accessor<string | undefined> },
) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [...queryKeys.agent.routineRuns(params.id()), queryKey()],
		queryFn: () =>
			request<ResponseBody<AgentRun[]>>({
				url: `/lucid/api/v1/agent/routines/${params.id()}/runs`,
				query: queryParams(),
			}),
		placeholderData: keepPreviousData,
		refetchInterval: (query) =>
			query.state.data?.data.some((run) => isRunWorking(run.status))
				? 5000
				: false,
		get enabled() {
			return (
				params.id() !== undefined && (params.enabled ? params.enabled() : true)
			);
		},
	}));
};

export default useGetRoutineRuns;

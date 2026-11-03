import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { DeployRun, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	perPage?: number;
}

/** Deploy run history, refreshed every 5 seconds while a listed run is unfinished and every 30 otherwise, to pick up new runs. */
const useGetRuns = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.deploys.runs(), queryKey(), params.key?.()],
		queryFn: ({ signal }) =>
			request<ResponseBody<DeployRun[]>>({
				url: "/api/v1/deploys/runs",
				query: queryParams(),
				signal,
				method: "GET",
			}),
		placeholderData: keepPreviousData,
		refetchInterval: (query) =>
			query.state.data?.data.some(
				(run) =>
					run.status === "queued" ||
					run.status === "starting" ||
					run.status === "running",
			)
				? 5_000
				: 30_000,
		refetchIntervalInBackground: false,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetRuns;

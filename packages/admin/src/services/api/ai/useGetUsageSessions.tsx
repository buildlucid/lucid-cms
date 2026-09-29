import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AiUsageSession, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
}

const useGetUsageSessions = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.ai.usageSessions(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<AiUsageSession[]>>({
				url: "/lucid/api/v1/ai/usage/sessions",
				query: queryParams(),
				method: "GET",
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetUsageSessions;

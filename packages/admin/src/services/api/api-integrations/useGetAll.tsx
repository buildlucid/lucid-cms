import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { ApiIntegration, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
}

const useGetAll = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["apiIntegrations.getAll", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ApiIntegration[]>>({
				url: "/lucid/api/v1/integrations/api",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetAll;

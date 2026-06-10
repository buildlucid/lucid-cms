import { useQuery } from "@tanstack/solid-query";
import type { License, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
}

const LICENSE_STATUS_STALE_TIME_MS = 60 * 60 * 1000;

const useGetStatus = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["license.getStatus", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<License>>({
				url: "/lucid/api/v1/license/status",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		staleTime: LICENSE_STATUS_STALE_TIME_MS,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetStatus;

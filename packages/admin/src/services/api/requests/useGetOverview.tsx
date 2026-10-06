import { useQuery } from "@tanstack/solid-query";
import type { RequestOverview, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetOverview = (params: QueryHook<Record<string, never>>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.requests.overview(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<RequestOverview>>({
				url: "/lucid/api/v1/requests/overview",
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetOverview;

import { useQuery } from "@tanstack/solid-query";
import type { ReleaseOverview, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetOverview = (params: QueryHook<Record<string, never>>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.releases.overview(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ReleaseOverview>>({
				url: "/lucid/api/v1/releases/overview",
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetOverview;

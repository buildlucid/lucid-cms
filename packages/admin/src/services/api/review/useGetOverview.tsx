import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, ReviewOverview } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetOverview = (params: QueryHook<Record<string, never>>) =>
	useQuery(() => ({
		queryKey: [...queryKeys.review.overview(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ReviewOverview>>({
				url: "/lucid/api/v1/review/overview",
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

export default useGetOverview;

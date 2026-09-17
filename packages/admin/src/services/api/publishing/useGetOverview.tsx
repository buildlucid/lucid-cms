import { useQuery } from "@tanstack/solid-query";
import type { PublishingOverview, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetOverview = (params: QueryHook<Record<string, never>>) =>
	useQuery(() => ({
		queryKey: [...queryKeys.publishing.overview(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishingOverview>>({
				url: "/lucid/api/v1/publishing/overview",
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

export default useGetOverview;

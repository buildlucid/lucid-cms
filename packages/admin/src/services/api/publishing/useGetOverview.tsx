import { useQuery } from "@tanstack/solid-query";
import type { PublishingOverview, ResponseBody } from "@types";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetOverview = (params: QueryHook<Record<string, never>>) =>
	useQuery(() => ({
		queryKey: ["publishing.getOverview", params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishingOverview>>({
				url: "/lucid/api/v1/publishing/overview",
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

export default useGetOverview;

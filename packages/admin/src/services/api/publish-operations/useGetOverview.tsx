import { useQuery } from "@tanstack/solid-query";
import type { PublishOperationOverview, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	filters?: {
		collectionKey?: Accessor<string | undefined>;
		target?: Accessor<string | undefined>;
	};
}

const useGetOverview = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["publishOperations.getOverview", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishOperationOverview>>({
				url: "/lucid/api/v1/publish-operations/overview",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetOverview;

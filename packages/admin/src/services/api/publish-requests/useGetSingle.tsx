import { useQuery } from "@tanstack/solid-query";
import type { PublishOperation, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		id: Accessor<number | undefined> | number | undefined;
	};
}

const useGetSingle = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["publishRequests.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishOperation>>({
				url: `/lucid/api/v1/publish-requests/${queryParams().location?.id}`,
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return (
				(params.enabled ? params.enabled() : true) &&
				queryParams().location?.id !== undefined
			);
		},
	}));
};

export default useGetSingle;

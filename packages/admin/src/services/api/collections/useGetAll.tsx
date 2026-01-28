import { useQuery } from "@tanstack/solid-query";
import type { CollectionResponse, ResponseBody } from "@types";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetAll = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["collections.getAll", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<CollectionResponse[]>>({
				url: "/lucid/api/v1/collections",
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

export default useGetAll;

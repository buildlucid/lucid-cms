import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AiUsage, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		featureKey?: Accessor<string>;
		status?: Accessor<string[]>;
		model?: Accessor<string>;
		userId?: Accessor<Array<string | number>>;
	};
	perPage?: number;
}

const useGetUsage = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["ai.getUsage", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<AiUsage[]>>({
				url: "/lucid/api/v1/ai/usage",
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

export default useGetUsage;

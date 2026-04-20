import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, Role } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	include: Record<"permissions", boolean>;
	filters?: {
		roleIds?: Accessor<number>;
		name?: Accessor<string>;
	};
	perPage?: number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["roles.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<Role[]>>({
				url: "/lucid/api/v1/roles",
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

export default useGetMultiple;

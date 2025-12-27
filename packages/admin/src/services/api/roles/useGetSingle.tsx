import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, RoleResponse } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		roleId: Accessor<number | undefined>;
	};
}

const useGetSingle = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["roles.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<RoleResponse>>({
				url: `/api/v1/roles/${queryParams().location?.roleId}`,
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetSingle;

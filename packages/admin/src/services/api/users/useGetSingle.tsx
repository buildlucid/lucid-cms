import { createMemo, type Accessor } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, UserResponse } from "@types";

interface QueryParams {
	location: {
		userId: Accessor<number | undefined>;
	};
}

const useGetSingle = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams || {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["users.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<UserResponse>>({
				url: `/api/v1/users/${queryParams().location?.userId}`,
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

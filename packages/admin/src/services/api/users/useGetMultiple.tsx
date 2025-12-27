import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, UserResponse } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		firstName?: Accessor<string>;
		lastName?: Accessor<string>;
		email?: Accessor<string>;
		username?: Accessor<string | undefined>;
		id?: Accessor<number | number[]>;
		isDeleted?: Accessor<1 | 0> | 1 | 0;
	};
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams || {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["users.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<UserResponse[]>>({
				url: "/api/v1/users",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

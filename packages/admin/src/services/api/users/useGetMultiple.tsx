import { createMemo, type Accessor } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, UserResponse } from "@types";

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
	return createQuery(() => ({
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

import { createQuery } from "@tanstack/solid-query";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, UserLoginResponse } from "@types";

interface QueryParams {
	queryString?: () => string;
	location?: {
		userId: () => number | undefined;
	};
	filters?: {
		[key: string]: () => string | number | undefined;
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
		queryKey: ["userLogins.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<UserLoginResponse[]>>({
				url: `/api/v1/users/logins/${queryParams().location?.userId}`,
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

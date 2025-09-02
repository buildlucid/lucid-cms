import { createMemo, type Accessor } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, LicenseResponse } from "@types";

interface QueryParams {
	queryString?: Accessor<string>;
}

const useGetStatus = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return createQuery(() => ({
		queryKey: ["license.getStatus", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<LicenseResponse>>({
				url: "/api/v1/license/status",
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

export default useGetStatus;

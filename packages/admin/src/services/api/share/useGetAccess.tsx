import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, ShareLinkAccess } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		token: Accessor<string | undefined> | string;
	};
}

const useGetAccess = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["share.getAccess", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ShareLinkAccess>>({
				url: `/lucid/api/v1/share/${queryParams().location?.token}`,
				config: {
					method: "GET",
				},
			}),
		retry: 0,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
		get refetchOnWindowFocus() {
			return params.refetchOnWindowFocus ?? false;
		},
	}));
};

export default useGetAccess;

import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody } from "@types";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		token: string;
	};
}

const useVerifyEmailChangeRevert = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["account.verifyEmailChangeRevert", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<undefined>>({
				url: `/lucid/api/v1/account/email-change/revert/${queryParams().location?.token}`,
				config: {
					method: "GET",
				},
			}),
		retry: 0,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useVerifyEmailChangeRevert;

import { createMemo } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface QueryParams {
	location: {
		token: string;
	};
}

const useVerifyResetToken = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return createQuery(() => ({
		queryKey: ["account.verifyResetToken", queryKey(), params.key?.()],
		queryFn: () =>
			request<
				ResponseBody<{
					message: string;
				}>
			>({
				url: `/api/v1/account/reset-password/${queryParams().location?.token}`,
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

export default useVerifyResetToken;

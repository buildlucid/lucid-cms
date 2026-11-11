import { useQuery } from "@tanstack/solid-query";
import { createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

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
	return useQuery(() => ({
		queryKey: [
			...queryKeys.account.verifyResetToken(),
			queryKey(),
			params.key?.(),
		],
		//* a valid token answers with no body, and a query can't resolve to undefined
		queryFn: async () => {
			await request({
				url: `/api/v1/account/reset-password/${queryParams().location?.token}`,
				method: "GET",
			});
			return null;
		},
		retry: 0,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useVerifyResetToken;

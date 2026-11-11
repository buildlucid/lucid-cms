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

const useVerifyEmailChangeConfirm = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [
			...queryKeys.account.verifyEmailChangeConfirm(),
			queryKey(),
			params.key?.(),
		],
		//* a valid token answers with no body, and a query can't resolve to undefined
		queryFn: async () => {
			await request({
				url: `/api/v1/account/email-change/confirm/${queryParams().location?.token}`,
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

export default useVerifyEmailChangeConfirm;

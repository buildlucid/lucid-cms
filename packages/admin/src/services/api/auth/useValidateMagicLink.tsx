import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, ValidateMagicLink } from "@types";
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

const useValidateMagicLink = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [
			...queryKeys.auth.validateMagicLink(),
			queryKey(),
			params.key?.(),
		],
		queryFn: () =>
			request<ResponseBody<ValidateMagicLink>>({
				url: `/api/v1/auth/magic-link/validate/${queryParams().location?.token}`,
				method: "GET",
				//* the page shows an expired link state instead
				displayErrorToast: false,
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

export default useValidateMagicLink;

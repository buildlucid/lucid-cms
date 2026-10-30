import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody } from "@types";
import { createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// oxlint-disable-next-line typescript/no-empty-object-type
interface QueryParams {}

interface SetupRequiredResponse {
	setupRequired: boolean;
}

const useSetupRequired = (params?: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams || {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.auth.setupRequired(), queryKey(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<SetupRequiredResponse>>({
				url: "/api/v1/auth/setup-required",
				method: "GET",
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
		retry: false,
		refetchOnWindowFocus: false,
	}));
};

export default useSetupRequired;

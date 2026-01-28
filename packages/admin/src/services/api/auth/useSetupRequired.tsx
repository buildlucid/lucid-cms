import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody } from "@types";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
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
		queryKey: ["auth.setupRequired", queryKey(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<SetupRequiredResponse>>({
				url: "/lucid/api/v1/auth/setup-required",
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
		retry: false,
		refetchOnWindowFocus: false,
	}));
};

export default useSetupRequired;

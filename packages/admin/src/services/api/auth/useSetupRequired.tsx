import { createMemo } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
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
	return createQuery(() => ({
		queryKey: ["auth.setupRequired", queryKey(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<SetupRequiredResponse>>({
				url: "/api/v1/auth/setup-required",
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

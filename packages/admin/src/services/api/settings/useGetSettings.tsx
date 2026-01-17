import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, SettingsInclude, SettingsResponse } from "@types";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	include?: Partial<Record<SettingsInclude, boolean>>;
}

const useGetSettings = (params?: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams || {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["settings.getSettings", queryKey(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<SettingsResponse>>({
				url: "/api/v1/settings",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetSettings;

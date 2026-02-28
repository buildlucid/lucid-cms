import { useQuery } from "@tanstack/solid-query";
import type { ClientScopeGroup, ResponseBody } from "@types";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetScopes = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["clientIntegrations.getScopes", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ClientScopeGroup[]>>({
				url: "/lucid/api/v1/client-integrations/scopes",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetScopes;

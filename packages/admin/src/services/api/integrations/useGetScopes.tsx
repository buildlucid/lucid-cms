import { useQuery } from "@tanstack/solid-query";
import type { ExternalScopeGroup, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetScopes = (params: QueryHook<Record<string, never>>) => {
	return useQuery(() => ({
		queryKey: [...queryKeys.integrations.scopes(), "system", params.key?.()],
		queryFn: () =>
			request<ResponseBody<ExternalScopeGroup[]>>({
				url: "/lucid/api/v1/integrations/scopes",
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetScopes;

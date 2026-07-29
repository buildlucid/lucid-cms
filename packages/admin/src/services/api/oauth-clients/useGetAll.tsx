import { useQuery } from "@tanstack/solid-query";
import type { OAuthClient, ResponseBody } from "@types";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetAll = (params: QueryHook<Record<string, never>>) => {
	// ----------------------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["oauthClients.getAll", params.key?.()],
		queryFn: () =>
			request<ResponseBody<OAuthClient[]>>({
				url: "/lucid/api/v1/integrations/oauth-clients",
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetAll;

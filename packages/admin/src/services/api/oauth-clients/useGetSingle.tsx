import { useQuery } from "@tanstack/solid-query";
import type { OAuthClient, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

interface QueryParams {
	id: Accessor<number | undefined>;
}

const useGetSingle = (params: QueryHook<QueryParams>) => {
	// ----------------------------------------
	// Query
	return useQuery(() => ({
		queryKey: [
			...queryKeys.oauthClients.detail(),
			params.queryParams.id(),
			params.key?.(),
		],
		queryFn: () =>
			request<ResponseBody<OAuthClient>>({
				url: `/lucid/api/v1/integrations/oauth-clients/${params.queryParams.id()}`,
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetSingle;

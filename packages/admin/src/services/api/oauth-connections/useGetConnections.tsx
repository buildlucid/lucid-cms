import { useQuery } from "@tanstack/solid-query";
import type { OAuthConnection, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import type { OAuthConnectionOwner } from "./types";
import { getOAuthConnectionsPath } from "./types";

const useGetConnections = (
	params: QueryHook<{
		owner: OAuthConnectionOwner;
	}>,
) =>
	useQuery(() => ({
		queryKey: [
			...queryKeys.oauthConnections.list(),
			params.queryParams.owner.type,
			params.queryParams.owner.type === "user"
				? params.queryParams.owner.userId
				: undefined,
			params.key?.(),
		],
		queryFn: () =>
			request<ResponseBody<OAuthConnection[]>>({
				url: getOAuthConnectionsPath(params.queryParams.owner),
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

export default useGetConnections;

import { useQuery } from "@tanstack/solid-query";
import type { ExternalScopeGroup, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const bindUseGetScopes =
	(userId: Accessor<number>) => (params: QueryHook<Record<string, never>>) => {
		return useQuery(() => ({
			queryKey: [
				...queryKeys.integrations.scopes(),
				"user",
				userId(),
				params.key?.(),
			],
			queryFn: () =>
				request<ResponseBody<ExternalScopeGroup[]>>({
					url: `/lucid/api/v1/users/${userId()}/integrations/scopes`,
					method: "GET",
				}),
			get enabled() {
				return params.enabled ? params.enabled() : true;
			},
		}));
	};

export default bindUseGetScopes;

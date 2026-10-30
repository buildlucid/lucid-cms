import { useQuery } from "@tanstack/solid-query";
import type { AuthProviders, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

// oxlint-disable-next-line typescript/no-empty-object-type
interface QueryParams {}

const useGetProviders = (params: QueryHook<QueryParams>) => {
	return useQuery(() => ({
		queryKey: [...queryKeys.auth.providers(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<AuthProviders>>({
				url: "/api/v1/auth/providers",
				method: "GET",
			}),
		retry: 0,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
		get refetchOnWindowFocus() {
			return params.refetchOnWindowFocus ?? false;
		},
	}));
};

export default useGetProviders;

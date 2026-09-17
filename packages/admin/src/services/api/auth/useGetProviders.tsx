import { useQuery } from "@tanstack/solid-query";
import type { AuthProviders, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetProviders = (params: QueryHook<QueryParams>) => {
	return useQuery(() => ({
		queryKey: [...queryKeys.auth.providers(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<AuthProviders>>({
				url: "/lucid/api/v1/auth/providers",
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

import { useQuery } from "@tanstack/solid-query";
import type { AuthProvidersResponse, ResponseBody } from "@types";
import request from "@/utils/request";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetProviders = (params: QueryHook<QueryParams>) => {
	return useQuery(() => ({
		queryKey: ["auth.getProviders", params.key?.()],
		queryFn: () =>
			request<ResponseBody<AuthProvidersResponse>>({
				url: "/api/v1/auth/providers",
				config: {
					method: "GET",
				},
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

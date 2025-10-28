import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import type { ResponseBody, AuthProvidersResponse } from "@types";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface QueryParams {}

const useGetProviders = (params: QueryHook<QueryParams>) => {
	return createQuery(() => ({
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

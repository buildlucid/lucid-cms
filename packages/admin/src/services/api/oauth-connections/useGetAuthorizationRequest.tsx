import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { OAuthAuthorizationRequest, ResponseBody } from "@types";
import request from "@/utils/request";

const useGetAuthorizationRequest = (params: {
	requestId: () => string;
	tenantKey: () => string | undefined;
}) =>
	useQuery(() => ({
		queryKey: [
			"oauthAuthorization.getRequest",
			params.requestId(),
			params.tenantKey(),
		],
		queryFn: () => {
			const tenantKey = params.tenantKey();
			return request<ResponseBody<OAuthAuthorizationRequest>>({
				url: `/lucid/api/v1/integrations/oauth/authorization/${params.requestId()}`,
				config: {
					method: "GET",
					tenant: false,
					headers: tenantKey ? { "X-Lucid-Tenant": tenantKey } : undefined,
				},
			});
		},
		placeholderData: keepPreviousData,
		get enabled() {
			return params.requestId().length > 0;
		},
	}));

export default useGetAuthorizationRequest;

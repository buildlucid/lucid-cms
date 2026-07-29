import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { OAuthAuthorizationRequest, ResponseBody } from "@types";
import request from "@/utils/request";

const useGetAuthorizationRequest = (params: { requestId: () => string }) =>
	useQuery(() => ({
		queryKey: ["oauthAuthorization.getRequest", params.requestId()],
		queryFn: () =>
			request<ResponseBody<OAuthAuthorizationRequest>>({
				url: `/lucid/api/v1/integrations/oauth/authorization/${params.requestId()}`,
				config: {
					method: "GET",
					displayErrorToast: false,
				},
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.requestId().length > 0;
		},
	}));

export default useGetAuthorizationRequest;

import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	requestId: string;
	body:
		| { decision: "deny" }
		| {
				decision: "allow";
				principalType: "system" | "user";
		  };
};

const useCompleteAuthorization = () =>
	serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ redirectUrl: string }>
	>({
		mutationFn: (params) =>
			request<ResponseBody<{ redirectUrl: string }>>({
				url: `/lucid/api/v1/integrations/oauth/authorization/${params.requestId}`,
				csrf: true,
				config: {
					method: "POST",
					body: params.body,
				},
			}),
		onSuccess: (response) => {
			window.location.assign(response.data.redirectUrl);
		},
	});

export default useCompleteAuthorization;

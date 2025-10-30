import type { InitiateAuthResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	providerKey: string;
	body: {
		invitationToken?: string;
		actionType: "invitation" | "login" | "authenticated-link";
		redirectPath?: string;
	};
}

export const initiateProviderReq = (params: Params) => {
	return request<ResponseBody<InitiateAuthResponse>>({
		url: `/api/v1/auth/providers/${params.providerKey}/initiate`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseInitiateProviderProps {
	onSuccess?: (data: ResponseBody<InitiateAuthResponse>) => void;
	onError?: () => void;
}

const useInitiateProvider = (props?: UseInitiateProviderProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<InitiateAuthResponse>
	>({
		mutationFn: initiateProviderReq,
		onSuccess: (data) => {
			if (data?.data?.redirectUrl) {
				window.location.href = data.data.redirectUrl;
			}
			props?.onSuccess?.(data);
		},
		onError: props?.onError,
	});
};

export default useInitiateProvider;

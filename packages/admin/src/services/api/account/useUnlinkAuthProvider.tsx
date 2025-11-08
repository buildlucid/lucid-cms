import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	providerKey: string;
}

export const unlinkAccountAuthProviderReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/account/auth-providers/${params.providerKey}`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseUnlinkAccountAuthProviderProps {
	onSuccess?: () => void;
	onError?: () => void;
	onMutate?: (_params: Params) => void;
}

const useUnlinkAuthProvider = (props?: UseUnlinkAccountAuthProviderProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: unlinkAccountAuthProviderReq,
		invalidates: ["users.getSingle", "auth.getProviders"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
		getSuccessToast: () => ({
			title: T()("auth_provider_unlinked_toast_title"),
			message: T()("auth_provider_unlinked_toast_message"),
		}),
	});
};

export default useUnlinkAuthProvider;

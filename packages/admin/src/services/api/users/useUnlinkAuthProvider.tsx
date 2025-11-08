import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	userId: number;
	providerKey: string;
}

export const unlinkAuthProviderReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/api/v1/users/${params.userId}/auth-providers/${params.providerKey}`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseUnlinkAuthProviderProps {
	onSuccess?: () => void;
	onError?: () => void;
	onMutate?: (_params: Params) => void;
}

const useUnlinkAuthProvider = (props?: UseUnlinkAuthProviderProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: unlinkAuthProviderReq,
		invalidates: ["users.getSingle"],
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

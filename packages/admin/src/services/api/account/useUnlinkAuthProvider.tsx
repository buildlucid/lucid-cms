import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	providerKey: string;
}

export const unlinkAccountAuthProviderReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/lucid/api/v1/account/auth-providers/${params.providerKey}`,
		csrf: true,
		method: "DELETE",
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
		invalidates: [
			queryKeys.account.all(),
			queryKeys.users.detail(),
			queryKeys.auth.providers(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
		getSuccessToast: () => ({
			title: T()("toasts.common.auth.provider.unlinked.title"),
			message: T()("toasts.common.auth.provider.unlinked.message"),
		}),
	});
};

export default useUnlinkAuthProvider;

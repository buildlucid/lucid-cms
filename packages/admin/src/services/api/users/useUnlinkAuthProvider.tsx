import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	userId: number;
	providerKey: string;
}

export const unlinkAuthProviderReq = (params: Params) => {
	return request<ResponseBody>({
		url: `/lucid/api/v1/users/${params.userId}/auth-providers/${params.providerKey}`,
		csrf: true,
		method: "DELETE",
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
		invalidates: [queryKeys.users.detail()],
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

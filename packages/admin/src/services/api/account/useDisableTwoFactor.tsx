import type { ResponseBody, TwoFactorProof } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const disableTwoFactorReq = (params: TwoFactorProof) => {
	return request<ResponseBody>({
		url: "/api/v1/account/two-factor/disable",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseDisableTwoFactorProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDisableTwoFactor = (props?: UseDisableTwoFactorProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<TwoFactorProof, ResponseBody>({
		mutationFn: disableTwoFactorReq,
		getSuccessToast: () => ({
			title: T()("toasts.account.two.factor.disabled.title"),
			message: T()("toasts.account.two.factor.disabled.message"),
		}),
		invalidates: [queryKeys.account.session()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDisableTwoFactor;

import type {
	ResponseBody,
	TwoFactorProof,
	TwoFactorRecoveryCodes,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const regenerateRecoveryCodesReq = (params: TwoFactorProof) => {
	return request<ResponseBody<TwoFactorRecoveryCodes>>({
		url: "/api/v1/account/two-factor/recovery-codes",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseRegenerateRecoveryCodesProps {
	onSuccess?: (_data: ResponseBody<TwoFactorRecoveryCodes>) => void;
	onError?: () => void;
}

const useRegenerateRecoveryCodes = (
	props?: UseRegenerateRecoveryCodesProps,
) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		TwoFactorProof,
		ResponseBody<TwoFactorRecoveryCodes>
	>({
		mutationFn: regenerateRecoveryCodesReq,
		invalidates: [queryKeys.account.session()],
		onSuccess: (data) => props?.onSuccess?.(data),
		onError: props?.onError,
	});
};

export default useRegenerateRecoveryCodes;

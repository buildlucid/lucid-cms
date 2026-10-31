import type { ResponseBody, TwoFactorRecoveryCodes } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	code: string;
}

export const confirmTwoFactorReq = (params: Params) => {
	return request<ResponseBody<TwoFactorRecoveryCodes>>({
		url: "/api/v1/account/two-factor/confirm",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseConfirmTwoFactorProps {
	onSuccess?: (_data: ResponseBody<TwoFactorRecoveryCodes>) => void;
	onError?: () => void;
}

const useConfirmTwoFactor = (props?: UseConfirmTwoFactorProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<TwoFactorRecoveryCodes>
	>({
		mutationFn: confirmTwoFactorReq,
		invalidates: [queryKeys.account.session()],
		onSuccess: (data) => props?.onSuccess?.(data),
		onError: props?.onError,
	});
};

export default useConfirmTwoFactor;

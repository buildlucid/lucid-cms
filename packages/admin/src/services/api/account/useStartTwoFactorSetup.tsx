import type { ResponseBody, TwoFactorSetup } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

/** Replacing an app that's already set up needs a code from it, or a recovery code. */
type Params = { code?: string; recoveryCode?: string };

export const startTwoFactorSetupReq = (params: Params) => {
	return request<ResponseBody<TwoFactorSetup>>({
		url: "/api/v1/account/two-factor/setup",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseStartTwoFactorSetupProps {
	onSuccess?: (_data: ResponseBody<TwoFactorSetup>) => void;
	onError?: () => void;
}

const useStartTwoFactorSetup = (props?: UseStartTwoFactorSetupProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<TwoFactorSetup>
	>({
		mutationFn: startTwoFactorSetupReq,
		onSuccess: (data) => props?.onSuccess?.(data),
		onError: props?.onError,
	});
};

export default useStartTwoFactorSetup;

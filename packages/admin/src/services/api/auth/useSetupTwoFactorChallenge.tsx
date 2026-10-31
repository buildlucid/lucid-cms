import type { ErrorResponse, ResponseBody, TwoFactorSetup } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const setupTwoFactorChallengeReq = () => {
	return request<ResponseBody<TwoFactorSetup>>({
		url: "/api/v1/auth/two-factor/setup",
		csrf: true,
		method: "POST",
	});
};

interface UseSetupTwoFactorChallengeProps {
	onSuccess?: (_data: ResponseBody<TwoFactorSetup>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useSetupTwoFactorChallenge = (
	props?: UseSetupTwoFactorChallengeProps,
) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		unknown,
		ResponseBody<TwoFactorSetup>
	>({
		mutationFn: setupTwoFactorChallengeReq,
		onSuccess: (data) => props?.onSuccess?.(data),
		onError: props?.onError,
	});
};

export default useSetupTwoFactorChallenge;

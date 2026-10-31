import type {
	ErrorResponse,
	ResponseBody,
	TwoFactorRecoveryCodes,
} from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	code: string;
}

export const confirmTwoFactorChallengeReq = (params: Params) => {
	return request<ResponseBody<TwoFactorRecoveryCodes>>({
		url: "/api/v1/auth/two-factor/confirm",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseConfirmTwoFactorChallengeProps {
	onSuccess?: (_data: ResponseBody<TwoFactorRecoveryCodes>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

/** Turns on the authenticator app set up while logging in. The session starts here, with recovery codes still to show. */
const useConfirmTwoFactorChallenge = (
	props?: UseConfirmTwoFactorChallengeProps,
) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<TwoFactorRecoveryCodes>
	>({
		mutationFn: confirmTwoFactorChallengeReq,
		onSuccess: (data) => props?.onSuccess?.(data),
		onError: props?.onError,
	});
};

export default useConfirmTwoFactorChallenge;

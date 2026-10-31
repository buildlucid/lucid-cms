import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ErrorResponse, ResponseBody, TwoFactorProof } from "@types";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const verifyTwoFactorReq = (params: TwoFactorProof) => {
	return request<ResponseBody>({
		url: "/api/v1/auth/two-factor/verify",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseVerifyTwoFactorProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useVerifyTwoFactor = (props?: UseVerifyTwoFactorProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const location = useLocation();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<TwoFactorProof, ResponseBody>({
		mutationFn: verifyTwoFactorReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		onSuccess: () => {
			queryClient.clear();
			navigate(getLoginReturnPath(location.search));
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useVerifyTwoFactor;

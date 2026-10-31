import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ResponseBody } from "@types";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = { token: string } | { email: string; code: string };

export const magicLinkLoginReq = (params: Params) => {
	return request<ResponseBody>({
		url: "/api/v1/auth/magic-link/login",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseMagicLinkLoginProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useMagicLinkLogin = (props?: UseMagicLinkLoginProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const location = useLocation();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: magicLinkLoginReq,
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

export default useMagicLinkLogin;

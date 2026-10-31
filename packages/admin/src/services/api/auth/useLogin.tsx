import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { LoginResult, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	usernameOrEmail: string;
	password: string;
	captchaToken?: string;
}

export const loginReq = (params: Params) => {
	return request<ResponseBody<LoginResult>>({
		url: "/api/v1/auth/login",
		csrf: true,
		method: "POST",
		body: {
			usernameOrEmail: params.usernameOrEmail,
			password: params.password,
		},
		captchaToken: params.captchaToken,
	});
};

interface UseLoginProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useLogin = (props?: UseLoginProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const location = useLocation();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<LoginResult>>({
		mutationFn: loginReq,
		getSuccessToast: (res) =>
			res.data.twoFactor
				? undefined
				: {
						title: T()("toasts.common.login.success.title"),
						message: T()("toasts.common.login.success.message"),
					},
		invalidates: [queryKeys.roles.list(), queryKeys.roles.detail()],
		onSuccess: (res) => {
			//* a two-factor step means there's no session until it's done
			if (res.data.twoFactor) {
				navigate(`/admin/two-factor${location.search}`);
			} else {
				queryClient.clear();
				navigate(getLoginReturnPath(location.search));
			}
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useLogin;

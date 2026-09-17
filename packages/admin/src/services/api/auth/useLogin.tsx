import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ResponseBody, User } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	usernameOrEmail: string;
	password: string;
}

export const loginReq = (params: Params) => {
	return request<ResponseBody<User>>({
		url: "/lucid/api/v1/auth/login",
		csrf: true,
		method: "POST",
		body: params,
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
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<User>>({
		mutationFn: loginReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		invalidates: [queryKeys.roles.list(), queryKeys.roles.detail()],
		onSuccess: () => {
			queryClient.clear();
			navigate(getLoginReturnPath(location.search));
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useLogin;

import { useNavigate } from "@solidjs/router";
import type { ResponseBody, User } from "@types";
import T from "@/translations";
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
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseLoginProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useLogin = (props?: UseLoginProps) => {
	const navigate = useNavigate();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<User>>({
		mutationFn: loginReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		invalidates: ["roles.getMultiple", "roles.getSingle"],
		onSuccess: () => {
			navigate("/lucid");
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useLogin;

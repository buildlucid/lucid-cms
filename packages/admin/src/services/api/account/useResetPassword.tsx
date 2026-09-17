import { useNavigate } from "@solidjs/router";
import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
	password: string;
	passwordConfirmation: string;
}

export const resetPasswordReq = async (params: Params) => {
	return request<
		ResponseBody<{
			message: string;
		}>
	>({
		url: `/lucid/api/v1/account/reset-password/${params.token}`,
		csrf: true,
		method: "PATCH",
		body: {
			password: params.password,
			passwordConfirmation: params.passwordConfirmation,
		},
	});
};

interface UseResetPasswordProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useResetPassword = (props?: UseResetPasswordProps) => {
	const navigate = useNavigate();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			message: string;
		}>
	>({
		mutationFn: resetPasswordReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.password.reset.success.title"),
			message: T()("toasts.common.password.reset.success.message"),
		}),
		invalidates: [
			queryKeys.account.all(),
			queryKeys.roles.list(),
			queryKeys.roles.detail(),
		],
		onSuccess: () => {
			navigate("/lucid/login");
			props?.onSuccess?.();
		},
		onError: () => {
			props?.onError?.();
		},
	});
};

export default useResetPassword;

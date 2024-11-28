import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	email: string;
}

export const sendPasswordResetReq = (params: Params) => {
	return request<
		ResponseBody<{
			message: string;
		}>,
		Params
	>({
		url: "/api/v1/account/reset-password",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseForgotPasswordProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useForgotPassword = (props: UseForgotPasswordProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			message: string;
		}>
	>({
		mutationFn: sendPasswordResetReq,
		getSuccessToast: () => ({
			title: T()("password_reset_toast_title"),
			message: T()("password_reset_toast_message"),
		}),
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useForgotPassword;

import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	firstName?: string;
	lastName?: string;
	username?: string;
	email?: string;
	currentPassword?: string;
	newPassword?: string;
	passwordConfirmation?: string;
}

export const updateMeReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/api/v1/account",
		csrf: true,
		config: {
			method: "PATCH",
			body: {
				firstName: params.firstName,
				lastName: params.lastName,
				username: params.username,
				email: params.email,
				currentPassword: params.currentPassword,
				newPassword: params.newPassword,
				passwordConfirmation: params.passwordConfirmation,
			},
		},
	});
};

interface useUpdateMeProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateMe = (props?: useUpdateMeProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateMeReq,
		getSuccessToast: () => ({
			title: T()("account_update_toast_title"),
			message: T()("account_update_toast_message"),
		}),
		invalidates: ["users.getMultiple", "users.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateMe;

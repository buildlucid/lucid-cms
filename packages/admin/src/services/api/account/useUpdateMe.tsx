import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

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
		url: "/lucid/api/v1/account",
		csrf: true,
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
	});
};

interface useUpdateMeProps {
	onSuccess?: (_data: ResponseBody<undefined>, _params: Params) => void;
	onError?: () => void;
}

const useUpdateMe = (props?: useUpdateMeProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateMeReq,
		getSuccessToast: (_data, params) => {
			return {
				title: T()("toasts.account.update.title"),
				message:
					params.email !== undefined
						? T()("toasts.account.update.email.message")
						: T()("toasts.account.update.message"),
			};
		},
		invalidates: [
			queryKeys.account.all(),
			queryKeys.users.list(),
			queryKeys.users.detail(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateMe;

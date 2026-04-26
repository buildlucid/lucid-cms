import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
}

export const confirmEmailChangeReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/account/email-change/confirm/${params.token}`,
		csrf: true,
		config: {
			method: "PATCH",
		},
	});
};

interface UseConfirmEmailChangeProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useConfirmEmailChange = (props?: UseConfirmEmailChangeProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: confirmEmailChangeReq,
		getSuccessToast: () => ({
			title: T()("email_change_confirm_success_toast_title"),
			message: T()("email_change_confirm_success_toast_message"),
		}),
		invalidates: ["users.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useConfirmEmailChange;

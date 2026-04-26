import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
}

export const revertEmailChangeReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/account/email-change/revert/${params.token}`,
		csrf: true,
		config: {
			method: "PATCH",
		},
	});
};

interface UseRevertEmailChangeProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useRevertEmailChange = (props?: UseRevertEmailChangeProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: revertEmailChangeReq,
		getSuccessToast: () => ({
			title: T()("email_change_revert_success_toast_title"),
			message: T()("email_change_revert_success_toast_message"),
		}),
		invalidates: ["users.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRevertEmailChange;

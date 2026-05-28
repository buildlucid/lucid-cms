import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<string, never>;

export const cancelEmailChangeReq = (_params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/account/email-change",
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseCancelEmailChangeProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useCancelEmailChange = (props?: UseCancelEmailChangeProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: cancelEmailChangeReq,
		getSuccessToast: () => ({
			title: T()("toasts.email.change.cancel.success.title"),
			message: T()("toasts.email.change.cancel.success.message"),
		}),
		invalidates: ["users.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCancelEmailChange;

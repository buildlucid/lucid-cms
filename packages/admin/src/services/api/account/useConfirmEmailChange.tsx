import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
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
		method: "PATCH",
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
			title: T()("toasts.email.change.confirm.success.title"),
			message: T()("toasts.email.change.confirm.success.message"),
		}),
		invalidates: [queryKeys.account.all(), queryKeys.users.detail()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useConfirmEmailChange;

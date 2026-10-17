import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
}

export const reopenReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/requests/${params.id}/reopen`,
		csrf: true,
		method: "POST",
	});
};

interface UseReopenProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useReopen = (props?: UseReopenProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: reopenReq,
		getSuccessToast: () => ({
			title: T()("toasts.requests.reopened.title"),
			message: T()("toasts.requests.reopened.message"),
		}),
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useReopen;

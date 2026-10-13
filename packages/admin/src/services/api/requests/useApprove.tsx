import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	body: {
		body?: RichTextJSON;
		ifUnchanged: string;
	};
}

export const approveReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/requests/${params.id}/approve`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseApproveProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useApprove = (props?: UseApproveProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: approveReq,
		getSuccessToast: () => ({
			title: T()("toasts.requests.approved.title"),
			message: T()("toasts.requests.approved.message"),
		}),
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useApprove;

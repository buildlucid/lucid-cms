import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	requestDocumentId: number;
	body: {
		target: string;
		acknowledged: boolean;
		/** The request's reviewToken as it was read. */
		ifUnchanged: string;
	};
}

export const acknowledgeTargetReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/requests/${params.id}/documents/${params.requestDocumentId}/targets/acknowledgement`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseAcknowledgeTargetProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useAcknowledgeTarget = (props?: UseAcknowledgeTargetProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: acknowledgeTargetReq,
		getSuccessToast: () => ({
			title: T()("toasts.requests.acknowledged.title"),
			message: T()("toasts.requests.acknowledged.message"),
		}),
		invalidates: [...requestChangeKeys(), queryKeys.documents.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useAcknowledgeTarget;

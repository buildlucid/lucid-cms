import type { ErrorResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	requestDocumentId: number;
}

export const removeDocumentReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/requests/${params.id}/documents/${params.requestDocumentId}`,
		csrf: true,
		method: "DELETE",
	});
};

interface UseRemoveDocumentProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useRemoveDocument = (props?: UseRemoveDocumentProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: removeDocumentReq,
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRemoveDocument;

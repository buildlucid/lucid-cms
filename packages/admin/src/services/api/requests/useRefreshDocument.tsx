import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	requestDocumentId: number;
}

export const refreshDocumentReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/requests/${params.id}/documents/${params.requestDocumentId}/refresh`,
		csrf: true,
		method: "POST",
	});
};

interface UseRefreshDocumentProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

/** Refreshes a publish request's copy of latest from latest, which dismisses its approval. */
const useRefreshDocument = (props?: UseRefreshDocumentProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: refreshDocumentReq,
		getSuccessToast: () => ({
			title: T()("toasts.requests.refreshed.title"),
			message: T()("toasts.requests.refreshed.message"),
		}),
		invalidates: [...requestChangeKeys(), queryKeys.documents.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRefreshDocument;

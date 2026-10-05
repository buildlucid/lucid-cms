import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	releaseDocumentId: number;
}

export const removeDocumentReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/documents/${params.releaseDocumentId}`,
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
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRemoveDocument;

import type { RequestDocumentInput } from "@lucidcms/types";
import type { ErrorResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	body: { documents: RequestDocumentInput[] };
}

export const addDocumentsReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/requests/${params.id}/documents`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseAddDocumentsProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useAddDocuments = (props?: UseAddDocumentsProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: addDocumentsReq,
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useAddDocuments;

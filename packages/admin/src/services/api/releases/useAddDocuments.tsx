import type { ErrorResponse, ReleaseDocumentInput, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	body: { documents: ReleaseDocumentInput[] };
}

export const addDocumentsReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/documents`,
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
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useAddDocuments;

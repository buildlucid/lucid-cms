import type { ErrorResponse, RequestDocumentInput, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	body: {
		documents: RequestDocumentInput[];
		title: string;
		reviewerIds?: number[];
	};
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<{ id: number }>>({
		url: `/lucid/api/v1/requests`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseCreateSingleProps {
	onSuccess?: (_response: ResponseBody<{ id: number }>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ id: number }>
	>({
		mutationFn: createSingleReq,
		invalidates: [queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;

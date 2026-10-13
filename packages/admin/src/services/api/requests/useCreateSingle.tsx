import type { RequestDocumentInput } from "@lucidcms/types";
import type { ErrorResponse, RequestType, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	body: {
		type: Exclude<RequestType, "create">;
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
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;

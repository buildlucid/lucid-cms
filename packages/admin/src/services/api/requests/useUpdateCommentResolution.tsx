import type {
	ErrorResponse,
	RequestCommentResolution,
	ResponseBody,
} from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	commentId: number;
	body: { resolution: RequestCommentResolution | null };
}

export const updateCommentResolutionReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/requests/${params.id}/comments/${params.commentId}/resolution`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdateCommentResolutionProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUpdateCommentResolution = (
	props?: UseUpdateCommentResolutionProps,
) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateCommentResolutionReq,
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateCommentResolution;

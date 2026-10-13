import type { ErrorResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
	commentId: number;
}

export const deleteCommentReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/requests/${params.id}/comments/${params.commentId}`,
		csrf: true,
		method: "DELETE",
	});
};

interface UseDeleteCommentProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useDeleteComment = (props?: UseDeleteCommentProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteCommentReq,
		invalidates: requestChangeKeys(),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteComment;

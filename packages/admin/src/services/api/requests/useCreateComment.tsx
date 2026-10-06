import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	/** `parentId` replies to a top-level comment. */
	body: { body: RichTextJSON; parentId?: number };
}

export const createCommentReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/requests/${params.id}/comments`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseCreateCommentProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useCreateComment = (props?: UseCreateCommentProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: createCommentReq,
		invalidates: [queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateComment;

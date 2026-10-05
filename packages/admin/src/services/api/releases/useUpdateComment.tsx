import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	eventId: number;
	body: { body: RichTextJSON };
}

export const updateCommentReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/comments/${params.eventId}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseUpdateCommentProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUpdateComment = (props?: UseUpdateCommentProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateCommentReq,
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateComment;

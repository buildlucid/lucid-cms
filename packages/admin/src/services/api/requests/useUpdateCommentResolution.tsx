import type {
	ErrorResponse,
	RequestCommentResolution,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	eventId: number;
	body: { resolution: RequestCommentResolution | null };
}

export const updateCommentResolutionReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/requests/${params.id}/comments/${params.eventId}/resolution`,
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
		invalidates: [queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateCommentResolution;

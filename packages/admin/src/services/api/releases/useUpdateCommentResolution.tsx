import type {
	ErrorResponse,
	ReleaseCommentResolution,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	eventId: number;
	body: { resolution: ReleaseCommentResolution | null };
}

export const updateCommentResolutionReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/comments/${params.eventId}/resolution`,
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
		invalidates: [queryKeys.releases.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateCommentResolution;

import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	releaseDocumentId: number;
	body: {
		revision: number;
		target: string;
		targetVersionId: number | null;
		reviewed: boolean;
	};
}

export const reviewTargetReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/releases/${params.id}/documents/${params.releaseDocumentId}/target-review`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

interface UseReviewTargetProps {
	onSuccess?: (_response: ResponseBody<null>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useReviewTarget = (props?: UseReviewTargetProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: reviewTargetReq,
		getSuccessToast: () => ({
			title: T()("toasts.releases.reviewed.title"),
			message: T()("toasts.releases.reviewed.message"),
		}),
		invalidates: [queryKeys.releases.all(), queryKeys.documents.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useReviewTarget;

import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	body: {
		assigneeIds?: number[];
	};
}

export const updateReviewersReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/publish-operations/${params.id}/reviewers`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseUpdateReviewersProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUpdateReviewers = (props?: UseUpdateReviewersProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateReviewersReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.update.title", {
				name: T()("common.reviewers"),
			}),
			message: T()("publish.requests.notifications.request.updated"),
		}),
		invalidates: [
			"documents.getMultiple",
			"documents.getSingle",
			"publishOperations.getMultiple",
			"publishOperations.getOverview",
			"publishOperations.getSingle",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateReviewers;

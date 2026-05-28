import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
}

export const retryReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/publish-operations/${params.id}/retry`,
		csrf: true,
		config: {
			method: "POST",
			body: {},
		},
	});
};

interface UseRetryProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useRetry = (props?: UseRetryProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: retryReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.update.title", {
				name: T()("publish.requests.notifications.request.name"),
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

export default useRetry;

import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	action: "approve" | "reject" | "cancel";
	body: {
		comment?: string;
	};
}

export const decisionReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/publish-requests/${params.id}/${params.action}`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseDecisionProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useDecision = (props?: UseDecisionProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: decisionReq,
		getSuccessToast: () => ({
			title: T()("update_toast_title", {
				name: T()("publish_request_toast_name"),
			}),
			message: T()("publish_request_updated_toast_message"),
		}),
		invalidates: [
			"documents.getMultiple",
			"documents.getSingle",
			"publishRequests.getMultiple",
			"publishRequests.getSingle",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDecision;

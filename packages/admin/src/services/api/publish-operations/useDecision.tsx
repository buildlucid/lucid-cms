import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	action: "approve" | "reject" | "cancel";
	body: {
		comment?: RichTextJSON;
		scheduledAt?: string | null;
		scheduledTimezone?: string | null;
	};
}

export const decisionReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/publish-operations/${params.id}/${params.action}`,
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

export default useDecision;

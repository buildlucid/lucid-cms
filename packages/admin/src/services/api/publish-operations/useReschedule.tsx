import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	body: {
		scheduledAt: string | null;
		scheduledTimezone: string | null;
	};
}

export const rescheduleReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/publish-operations/${params.id}/reschedule`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseRescheduleProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useReschedule = (props?: UseRescheduleProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: rescheduleReq,
		getSuccessToast: () => ({
			title: T()("update_toast_title", {
				name: T()("publish_request_toast_name"),
			}),
			message: T()("publish_request_updated_toast_message"),
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

export default useReschedule;

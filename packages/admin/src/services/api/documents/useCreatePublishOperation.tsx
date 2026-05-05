import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	collectionKey: string;
	body: {
		target: string;
		comment?: string;
		assigneeIds?: number[];
		autoAccept?: boolean;
	};
}

export const createPublishOperationReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/publish`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseCreatePublishOperationProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useCreatePublishOperation = (props?: UseCreatePublishOperationProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: createPublishOperationReq,
		getSuccessToast: () => ({
			title: T()("create_toast_title", {
				name: T()("publish_operation_toast_name"),
			}),
			message: T()("publish_operation_created_toast_message"),
		}),
		invalidates: [
			"documents.getMultiple",
			"documents.getSingle",
			"publishRequests.getMultiple",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreatePublishOperation;

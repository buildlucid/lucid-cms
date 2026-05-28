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
		scheduledAt?: string;
		scheduledTimezone?: string;
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
			title: T()("toasts.common.create.title", {
				name: T()("publish.requests.notifications.operation.name"),
			}),
			message: T()("publish.requests.notifications.operation.created"),
		}),
		invalidates: [
			"documents.getMultiple",
			"documents.getSingle",
			"publishOperations.getMultiple",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreatePublishOperation;

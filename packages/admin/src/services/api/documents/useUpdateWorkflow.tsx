import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
	collectionKey: string;
	body: {
		stage?: string;
		assigneeIds?: number[];
	};
}

export const updateWorkflowReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/workflow`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateWorkflowProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useUpdateWorkflow = (props?: UseUpdateWorkflowProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateWorkflowReq,
		getSuccessToast: () => ({
			title: T()("workflow_updated_toast_title"),
			message: T()("workflow_updated_toast_message"),
		}),
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateWorkflow;

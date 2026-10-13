import { useQueryClient } from "@tanstack/solid-query";
import type {
	ErrorResponse,
	RequestDetails,
	RequestExecution,
	RequestExecutionReceipt,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { requestChangeKeys } from "./change-keys";

export interface Params {
	id: number;
}

export const completeReq = (params: Params) => {
	return request<ResponseBody<RequestExecutionReceipt>>({
		url: `/lucid/api/v1/requests/${params.id}/complete`,
		csrf: true,
		method: "POST",
	});
};

interface UseCompleteProps {
	onSuccess?: (_response: ResponseBody<RequestExecutionReceipt>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useComplete = (props?: UseCompleteProps) => {
	const queryClient = useQueryClient();
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<RequestExecutionReceipt>
	>({
		mutationFn: completeReq,
		getSuccessToast: () => ({
			title: T()("toasts.requests.queued.title"),
			message: T()("toasts.requests.queued.message"),
		}),
		invalidates: requestChangeKeys(),
		onSuccess: (response, params) => {
			queryClient.setQueryData<ResponseBody<RequestExecution | null>>(
				queryKeys.requestExecutions.detail(params.id, response.data.jobId),
				{
					...response,
					data: {
						jobId: response.data.jobId,
						status: "queued",
						runAt: new Date().toISOString(),
						error: null,
					},
				},
			);
			queryClient.setQueriesData<ResponseBody<RequestDetails>>(
				{ queryKey: queryKeys.requests.detail() },
				(cached) =>
					cached?.data.id === params.id
						? {
								...cached,
								data: {
									...cached.data,
									executionJobId: response.data.jobId,
									failure: null,
								},
							}
						: cached,
			);
			props?.onSuccess?.(response);
		},
		onError: (errors) => {
			for (const queryKey of requestChangeKeys()) {
				queryClient.invalidateQueries({ queryKey });
			}
			props?.onError?.(errors);
		},
	});
};

export default useComplete;

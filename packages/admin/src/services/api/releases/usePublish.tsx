import { useQueryClient } from "@tanstack/solid-query";
import type {
	ErrorResponse,
	Release,
	ReleaseExecution,
	ReleaseExecutionReceipt,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	id: number;
}

export const publishReq = (params: Params) => {
	return request<ResponseBody<ReleaseExecutionReceipt>>({
		url: `/lucid/api/v1/releases/${params.id}/publish`,
		csrf: true,
		method: "POST",
	});
};

interface UsePublishProps {
	onSuccess?: (_response: ResponseBody<ReleaseExecutionReceipt>) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const usePublish = (props?: UsePublishProps) => {
	const queryClient = useQueryClient();
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<ReleaseExecutionReceipt>
	>({
		mutationFn: publishReq,
		getSuccessToast: () => ({
			title: T()("toasts.releases.queued.title"),
			message: T()("toasts.releases.queued.message"),
		}),
		invalidates: [queryKeys.releases.all()],
		onSuccess: (response, params) => {
			queryClient.setQueryData<ResponseBody<ReleaseExecution | null>>(
				queryKeys.releaseExecutions.detail(params.id, response.data.jobId),
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
			queryClient.setQueriesData<ResponseBody<Release>>(
				{ queryKey: queryKeys.releases.detail() },
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
			queryClient.invalidateQueries({ queryKey: queryKeys.releases.all() });
			props?.onError?.(errors);
		},
	});
};

export default usePublish;

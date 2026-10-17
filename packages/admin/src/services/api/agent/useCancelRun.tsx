import { useQueryClient } from "@tanstack/solid-query";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useCancelRun = () => {
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<
		{ id: string; conversationId: string },
		unknown
	>({
		mutationFn: (params) =>
			request({
				url: `/api/v1/agent/runs/${params.id}/cancel`,
				method: "POST",
			}),
		invalidates: [
			queryKeys.agent.conversationLists(),
			queryKeys.agent.routines(),
			queryKeys.notifications.summary(),
		],
		onSuccess: (_response, params) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.agent.conversation(params.conversationId),
			});
		},
	});
};

export default useCancelRun;

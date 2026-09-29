import { useQueryClient } from "@tanstack/solid-query";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

/** Unlinks a resource from a chat. Messages keep what was attached. */
const useDeleteReference = () => {
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<
		{ conversationId: string; referenceId: string },
		unknown
	>({
		mutationFn: (params) =>
			request({
				url: `/lucid/api/v1/agent/conversations/${params.conversationId}/references/${params.referenceId}`,
				method: "DELETE",
			}),
		onSuccess: (_response, params) => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.agent.references(params.conversationId),
			});
		},
	});
};

export default useDeleteReference;

import { useQueryClient } from "@tanstack/solid-query";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useDeleteConversation = (props?: { onSuccess?: () => void }) => {
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<{ id: string }, unknown>({
		mutationFn: (params) =>
			request({
				url: `/lucid/api/v1/agent/conversations/${params.id}`,
				method: "DELETE",
			}),
		getSuccessToast: () => ({
			title: T()("toasts.agent.conversation.deleted.title"),
			message: T()("toasts.agent.conversation.deleted.message"),
		}),
		invalidates: [queryKeys.agent.conversations(), queryKeys.agent.routines()],
		onSuccess: (_response, params) => {
			//* drop it before the list refetches so it is not requested again
			queryClient.removeQueries({
				queryKey: queryKeys.agent.conversation(params.id),
			});
			props?.onSuccess?.();
		},
	});
};

export default useDeleteConversation;

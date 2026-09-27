import { useQueryClient } from "@tanstack/solid-query";
import type {
	AgentApprovalMode,
	AgentConversation,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	id: string;
	body: { title?: string; approvalMode?: AgentApprovalMode };
};

const useUpdateConversation = (props?: { onSuccess?: () => void }) => {
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<AgentConversation>
	>({
		mutationFn: (params) =>
			request<ResponseBody<AgentConversation>>({
				url: `/lucid/api/v1/agent/conversations/${params.id}`,
				method: "PATCH",
				body: params.body,
			}),
		getSuccessToast: (_data, params) =>
			params.body.title === undefined
				? undefined
				: {
						title: T()("toasts.agent.conversation.renamed.title"),
						message: T()("toasts.agent.conversation.renamed.message"),
					},
		invalidates: [queryKeys.agent.conversations()],
		onSuccess: (response, params) => {
			queryClient.setQueryData(
				queryKeys.agent.conversation(params.id),
				response,
			);
			props?.onSuccess?.();
		},
	});
};

export default useUpdateConversation;

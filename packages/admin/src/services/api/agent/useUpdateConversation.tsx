import { useQueryClient } from "@tanstack/solid-query";
import type {
	AgentConfirmationMode,
	AgentConversation,
	AiModelSelection,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	id: string;
	body: {
		title?: string;
		confirmationMode?: AgentConfirmationMode;
		modelSelection?: AiModelSelection;
	};
};

const useUpdateConversation = (props?: { onSuccess?: () => void }) => {
	const queryClient = useQueryClient();

	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<AgentConversation>
	>({
		mutationFn: (params) =>
			request<ResponseBody<AgentConversation>>({
				url: `/api/v1/agent/conversations/${params.id}`,
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
		invalidates: [queryKeys.agent.conversationLists()],
		onSuccess: (response, params) => {
			queryClient.setQueryData(
				queryKeys.agent.conversation(params.id),
				response,
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.agent.conversationDetails(params.id),
			});
			props?.onSuccess?.();
		},
	});
};

export default useUpdateConversation;

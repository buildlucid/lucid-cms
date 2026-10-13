import type { AgentConversation, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useBranchConversation = (props?: {
	onSuccess?: (response: ResponseBody<AgentConversation>) => void;
}) =>
	serviceHelpers.useMutationWrapper<
		{ id: string; messageId: string },
		ResponseBody<AgentConversation>
	>({
		mutationFn: ({ id, messageId }) =>
			request<ResponseBody<AgentConversation>>({
				url: `/lucid/api/v1/agent/conversations/${id}/branch`,
				method: "POST",
				body: { messageId },
			}),
		invalidates: [queryKeys.agent.conversationLists()],
		onSuccess: props?.onSuccess,
	});

export default useBranchConversation;

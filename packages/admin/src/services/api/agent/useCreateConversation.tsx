import type {
	AgentConfirmationMode,
	AgentConversation,
	AiModelSelection,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useCreateConversation = (props?: {
	onSuccess?: (response: ResponseBody<AgentConversation>) => void;
}) =>
	serviceHelpers.useMutationWrapper<
		{
			id?: string;
			agentKey: string;
			title?: string;
			confirmationMode?: AgentConfirmationMode;
			modelSelection?: AiModelSelection;
		},
		ResponseBody<AgentConversation>
	>({
		mutationFn: (body) =>
			request<ResponseBody<AgentConversation>>({
				url: "/api/v1/agent/conversations",
				method: "POST",
				body,
			}),
		invalidates: [queryKeys.agent.conversationLists()],
		onSuccess: props?.onSuccess,
	});

export default useCreateConversation;

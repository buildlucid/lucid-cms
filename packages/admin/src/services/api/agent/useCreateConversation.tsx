import type { AgentConversation, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useCreateConversation = (props?: {
	onSuccess?: (response: ResponseBody<AgentConversation>) => void;
}) =>
	serviceHelpers.useMutationWrapper<
		{ agentKey: string; title?: string },
		ResponseBody<AgentConversation>
	>({
		mutationFn: (body) =>
			request<ResponseBody<AgentConversation>>({
				url: "/lucid/api/v1/agent/conversations",
				method: "POST",
				body,
			}),
		invalidates: [queryKeys.agent.conversations()],
		onSuccess: props?.onSuccess,
	});

export default useCreateConversation;

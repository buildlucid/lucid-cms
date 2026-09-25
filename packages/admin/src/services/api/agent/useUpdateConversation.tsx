import type { AgentConversation, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = { id: string; body: { title: string } };

const useUpdateConversation = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<AgentConversation>>({
		mutationFn: (params) =>
			request<ResponseBody<AgentConversation>>({
				url: `/lucid/api/v1/agent/conversations/${params.id}`,
				method: "PATCH",
				body: params.body,
			}),
		getSuccessToast: () => ({
			title: T()("toasts.agent.conversation.renamed.title"),
			message: T()("toasts.agent.conversation.renamed.message"),
		}),
		invalidates: [queryKeys.agent.conversations()],
		onSuccess: props?.onSuccess,
	});

export default useUpdateConversation;

import { useQuery } from "@tanstack/solid-query";
import type { AgentConversationDetails, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/**
 * Gets a conversation's usage and web sources. Its key sits under the
 * conversation list, so refreshing chats after a run refreshes it too.
 */
const useGetConversationDetails = (params: {
	id: Accessor<string | undefined>;
	enabled?: Accessor<boolean>;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.conversationDetails(params.id()),
		queryFn: () =>
			request<ResponseBody<AgentConversationDetails>>({
				url: `/lucid/api/v1/agent/conversations/${params.id()}/details`,
			}),
		enabled: params.id() !== undefined && (params.enabled?.() ?? true),
	}));

export default useGetConversationDetails;

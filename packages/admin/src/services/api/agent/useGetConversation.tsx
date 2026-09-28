import { useQuery } from "@tanstack/solid-query";
import type { AgentConversation, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/**
 * Gets a conversation and the status of its latest run. Streams keep it current,
 * so it only polls while `poll` asks for an interval.
 */
const useGetConversation = (params: {
	id: Accessor<string | undefined>;
	poll?: (conversation: AgentConversation) => number | false;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.conversation(params.id()),
		queryFn: () =>
			request<ResponseBody<AgentConversation>>({
				url: `/lucid/api/v1/agent/conversations/${params.id()}`,
			}),
		refetchInterval: (query) => {
			const conversation = query.state.data?.data;
			return conversation ? (params.poll?.(conversation) ?? false) : false;
		},
		enabled: params.id() !== undefined,
	}));

export default useGetConversation;

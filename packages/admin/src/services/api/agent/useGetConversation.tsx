import { queryOptions, useQuery } from "@tanstack/solid-query";
import type { AgentConversation, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import constants from "@/constants";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

export const conversationQueryOptions = (id: string | undefined) =>
	queryOptions({
		queryKey: queryKeys.agent.conversation(id),
		queryFn: () =>
			request<ResponseBody<AgentConversation>>({
				url: `/lucid/api/v1/agent/conversations/${id}`,
			}),
		enabled: id !== undefined,
		staleTime: constants.preloadStaleTime,
	});

/**
 * Gets a conversation and the status of its latest run. Streams keep it current,
 * so it only polls while `poll` asks for an interval.
 */
const useGetConversation = (params: {
	id: Accessor<string | undefined>;
	poll?: (conversation: AgentConversation) => number | false;
}) =>
	useQuery(() => ({
		...conversationQueryOptions(params.id()),
		refetchInterval: (query) => {
			const conversation = query.state.data?.data;
			return conversation ? (params.poll?.(conversation) ?? false) : false;
		},
	}));

export default useGetConversation;

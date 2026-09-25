import { useQuery } from "@tanstack/solid-query";
import type { AgentConversation, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** Gets a conversation and the status of its latest run. */
const useGetConversation = (params: { id: Accessor<string | undefined> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.conversation(params.id()),
		queryFn: () =>
			request<ResponseBody<AgentConversation>>({
				url: `/lucid/api/v1/agent/conversations/${params.id()}`,
			}),
		enabled: params.id() !== undefined,
	}));

export default useGetConversation;

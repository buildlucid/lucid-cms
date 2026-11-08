import { useQuery } from "@tanstack/solid-query";
import type { AgentSubagents, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { isRunFinished } from "@/utils/agent-chat";
import request from "@/utils/request";

/**
 * Gets a chat's parent and sub-agents, with any confirmation a sub-agent waits on.
 * Checks back while a sub-agent is still going, since the chat only streams its own run.
 */
const useGetSubagents = (params: { id: Accessor<string | undefined> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.subagents(params.id()),
		queryFn: ({ signal }) =>
			request<ResponseBody<AgentSubagents>>({
				url: `/api/v1/agent/conversations/${params.id()}/subagents`,
				signal,
				displayErrorToast: false,
			}),
		refetchInterval: (query) => {
			const data = query.state.data?.data;
			const going = [data?.parent, ...(data?.subagents ?? [])].some(
				(conversation) =>
					conversation?.latestRun &&
					!isRunFinished(conversation.latestRun.status),
			);
			return going ? 3_000 : false;
		},
		refetchIntervalInBackground: false,
		enabled: params.id() !== undefined,
	}));

export default useGetSubagents;

import { useQuery } from "@tanstack/solid-query";
import type { AgentToolDetails, AgentToolSummary, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** A selected call's raw values. Status changes fetch a fresh result without reloading history. */
const useGetToolDetails = (params: {
	conversationId: Accessor<string>;
	messageId: Accessor<string>;
	tool: Accessor<AgentToolSummary>;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.toolDetails(
			params.conversationId(),
			params.messageId(),
			params.tool().id,
			params.tool().status,
		),
		queryFn: ({ signal }) =>
			request<ResponseBody<AgentToolDetails>>({
				url: `/lucid/api/v1/agent/conversations/${params.conversationId()}/messages/${params.messageId()}/tools/${encodeURIComponent(params.tool().id)}`,
				signal,
				displayErrorToast: false,
			}),
		enabled: params.tool().detailsAvailable,
		staleTime: Number.POSITIVE_INFINITY,
	}));

export default useGetToolDetails;

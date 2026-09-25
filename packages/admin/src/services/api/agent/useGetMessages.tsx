import { useInfiniteQuery } from "@tanstack/solid-query";
import type { AgentMessage, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const pageSize = 50;

/** Loads a conversation's latest messages first, then earlier pages on demand. */
const useGetMessages = (params: { id: Accessor<string | undefined> }) =>
	useInfiniteQuery(() => ({
		queryKey: queryKeys.agent.messages(params.id()),
		queryFn: ({ pageParam }) =>
			request<ResponseBody<AgentMessage[]>>({
				url: `/lucid/api/v1/agent/conversations/${params.id()}/messages?${new URLSearchParams(
					{
						limit: String(pageSize),
						...(pageParam ? { before: String(pageParam) } : {}),
					},
				)}`,
			}),
		initialPageParam: undefined as number | undefined,
		getNextPageParam: (page) =>
			page.data.length === pageSize ? page.data[0]?.position : undefined,
		enabled: params.id() !== undefined,
	}));

export default useGetMessages;

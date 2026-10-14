import { useQuery } from "@tanstack/solid-query";
import type { AgentMemories, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** Gets the user's personal memories and the shared ones, with each scope's limit. */
const useGetMemories = (params?: { enabled?: Accessor<boolean> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.memories(),
		queryFn: () =>
			request<ResponseBody<AgentMemories>>({
				url: "/lucid/api/v1/agent/memories",
			}),
		enabled: params?.enabled?.() ?? true,
	}));

export default useGetMemories;

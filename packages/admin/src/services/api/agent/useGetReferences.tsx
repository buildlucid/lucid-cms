import { useQuery } from "@tanstack/solid-query";
import type { AgentReference, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** Fetches current resource details separately from conversation messages. */
const useGetReferences = (params: { id: Accessor<string | undefined> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.references(params.id()),
		queryFn: () =>
			request<ResponseBody<AgentReference[]>>({
				url: `/lucid/api/v1/agent/conversations/${params.id()}/references`,
			}),
		enabled: params.id() !== undefined,
	}));

export default useGetReferences;

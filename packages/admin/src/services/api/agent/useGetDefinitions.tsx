import { useQuery } from "@tanstack/solid-query";
import type { AgentCatalog, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetDefinitions = (params?: { enabled?: Accessor<boolean> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.definitions(),
		queryFn: () =>
			request<ResponseBody<AgentCatalog>>({
				url: "/lucid/api/v1/agent/definitions",
			}),
		enabled: params?.enabled?.() ?? true,
	}));

export default useGetDefinitions;

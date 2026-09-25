import { useQuery } from "@tanstack/solid-query";
import type { AgentRoutine, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetRoutine = (params: { id: Accessor<string | undefined> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.routine(params.id()),
		queryFn: () =>
			request<ResponseBody<AgentRoutine>>({
				url: `/lucid/api/v1/agent/routines/${params.id()}`,
			}),
		enabled: params.id() !== undefined,
	}));

export default useGetRoutine;

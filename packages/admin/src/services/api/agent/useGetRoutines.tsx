import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AgentRoutine, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetRoutines = () =>
	useQuery(() => ({
		queryKey: queryKeys.agent.routines(),
		queryFn: () =>
			request<ResponseBody<AgentRoutine[]>>({
				url: "/lucid/api/v1/agent/routines",
				query: { perPage: -1, sort: { title: "asc" } },
			}),
		placeholderData: keepPreviousData,
	}));

export default useGetRoutines;

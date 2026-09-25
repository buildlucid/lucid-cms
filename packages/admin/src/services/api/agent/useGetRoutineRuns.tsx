import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AgentRun, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { isRunWorking } from "@/utils/agent-chat";
import request from "@/utils/request";

/** Gets a routine's latest runs, refetching while one is still working. */
const useGetRoutineRuns = (params: {
	id: Accessor<string | undefined>;
	perPage: Accessor<number>;
}) =>
	useQuery(() => ({
		queryKey: [...queryKeys.agent.routineRuns(params.id()), params.perPage()],
		queryFn: () =>
			request<ResponseBody<AgentRun[]>>({
				url: `/lucid/api/v1/agent/routines/${params.id()}/runs`,
				query: { page: 1, perPage: params.perPage() },
			}),
		placeholderData: keepPreviousData,
		refetchInterval: (query) =>
			query.state.data?.data.some((run) => isRunWorking(run.status))
				? 5000
				: false,
		enabled: params.id() !== undefined,
	}));

export default useGetRoutineRuns;

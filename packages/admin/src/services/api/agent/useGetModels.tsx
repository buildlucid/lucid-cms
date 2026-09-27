import { useQuery } from "@tanstack/solid-query";
import type { AiModelCatalog, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import request from "@/utils/request";

/** Gets the models an agent offers. With a routine, its model becomes the default. */
const useGetModels = (params: {
	agentKey: Accessor<string | undefined>;
	routineId?: Accessor<string | undefined>;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.models(params.agentKey(), params.routineId?.()),
		queryFn: () =>
			request<ResponseBody<AiModelCatalog>>({
				url: `/lucid/api/v1/agent/models/${encodeURIComponent(params.agentKey() ?? "")}`,
				query: {
					queryString: params.routineId?.()
						? `routineId=${params.routineId()}`
						: undefined,
				},
			}),
		//* the catalogue comes from the Lucid service, so there is nothing to load without it
		enabled:
			params.agentKey() !== undefined &&
			getAgentUnavailableReason() === undefined,
		//* the server caches the catalogue too, so this only saves round trips
		staleTime: 60_000,
	}));

export default useGetModels;

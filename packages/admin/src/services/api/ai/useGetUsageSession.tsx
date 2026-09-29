import { useQuery } from "@tanstack/solid-query";
import type { AiUsageSession, AiUsageSessionType, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetUsageSession = (params: {
	type: Accessor<AiUsageSessionType | undefined>;
	id: Accessor<string | undefined>;
	enabled?: Accessor<boolean>;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.ai.usageSession(params.type(), params.id()),
		queryFn: () =>
			request<ResponseBody<AiUsageSession>>({
				url: `/lucid/api/v1/ai/usage/sessions/${params.type()}/${encodeURIComponent(params.id() ?? "")}`,
			}),
		enabled:
			params.type() !== undefined &&
			params.id() !== undefined &&
			(params.enabled?.() ?? true),
	}));

export default useGetUsageSession;

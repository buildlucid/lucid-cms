import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AiUsageRecord, AiUsageSessionType, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
}

const useGetUsageSessionRecords = (
	params: QueryHook<QueryParams> & {
		type: Accessor<AiUsageSessionType | undefined>;
		id: Accessor<string | undefined>;
	},
) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [
			...queryKeys.ai.usageSessionRecords(params.type(), params.id()),
			queryKey(),
		],
		queryFn: () =>
			request<ResponseBody<AiUsageRecord[]>>({
				url: `/lucid/api/v1/ai/usage/sessions/${params.type()}/${encodeURIComponent(params.id() ?? "")}/records`,
				query: queryParams(),
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return (
				params.type() !== undefined &&
				params.id() !== undefined &&
				(params.enabled ? params.enabled() : true)
			);
		},
	}));
};

export default useGetUsageSessionRecords;

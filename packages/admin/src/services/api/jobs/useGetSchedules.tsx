import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { JobScheduleSummary, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		key?: Accessor<string | undefined>;
		jobName?: Accessor<string | undefined>;
		jobVersion?: Accessor<number | undefined>;
	};
	perPage?: number;
}

const useGetSchedules = (params: Partial<QueryHook<QueryParams>> = {}) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams ?? {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [...queryKeys.jobs.schedules(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<JobScheduleSummary[]>>({
				url: "/lucid/api/v1/jobs/schedules",
				query: queryParams(),
				method: "GET",
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetSchedules;

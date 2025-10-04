import { createMemo, type Accessor } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, JobResponse } from "@types";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		jobId?: Accessor<string>;
		eventType?: Accessor<string>;
		status?: Accessor<string[]>;
		queueAdapterKey?: Accessor<string>;
	};
	perPage?: number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return createQuery(() => ({
		queryKey: ["jobs.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<JobResponse[]>>({
				url: "/api/v1/jobs",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

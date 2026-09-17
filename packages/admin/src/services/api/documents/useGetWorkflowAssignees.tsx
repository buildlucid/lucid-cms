import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, WorkflowUser } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		collectionKey?: Accessor<string | undefined> | string;
	};
}

const useGetWorkflowAssignees = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [
			...queryKeys.documents.workflowAssignees(),
			queryKey(),
			params.key?.(),
		],
		queryFn: () =>
			request<ResponseBody<WorkflowUser[]>>({
				url: `/lucid/api/v1/documents/${
					queryParams().location?.collectionKey
				}/workflow/assignees`,
				query: queryParams(),
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetWorkflowAssignees;

import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { ResponseBody, UserDisplay } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		id: Accessor<number | undefined>;
	};
	filters?: {
		/** Matches full names or usernames. */
		name?: Accessor<string | undefined>;
	};
}

/** Searches the people who can be asked to approve a request, 20 at a time. */
const useGetReviewers = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.requests.reviewers(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<UserDisplay[]>>({
				url: `/api/v1/requests/${queryParams().location?.id}/reviewers`,
				query: { filters: queryParams().filters },
				method: "GET",
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return (
				params.queryParams.location.id() !== undefined &&
				(params.enabled ? params.enabled() : true)
			);
		},
	}));
};

export default useGetReviewers;

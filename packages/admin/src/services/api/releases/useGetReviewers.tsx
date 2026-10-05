import { useQuery } from "@tanstack/solid-query";
import type { ReleaseUser, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		id: Accessor<number | undefined>;
	};
}

const useGetReviewers = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.releases.reviewers(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<ReleaseUser[]>>({
				url: `/lucid/api/v1/releases/${queryParams().location?.id}/reviewers`,
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetReviewers;

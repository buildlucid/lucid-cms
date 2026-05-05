import { useQuery } from "@tanstack/solid-query";
import type { PublishOperationReviewer, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import helpers from "@/utils/helpers";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	collectionKey: Accessor<string | undefined> | string | undefined;
	target: Accessor<string | undefined> | string | undefined;
}

const useGetReviewers = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams({
			queryString: new URLSearchParams({
				collectionKey:
					helpers.resolveValue(params.queryParams?.collectionKey) ?? "",
				target: helpers.resolveValue(params.queryParams?.target) ?? "",
			}).toString(),
		}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["publishRequests.getReviewers", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishOperationReviewer[]>>({
				url: "/lucid/api/v1/publish-requests/reviewers",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			const query = new URLSearchParams(queryParams().queryString);
			return (
				(params.enabled ? params.enabled() : true) &&
				!!query.get("collectionKey") &&
				!!query.get("target")
			);
		},
	}));
};

export default useGetReviewers;

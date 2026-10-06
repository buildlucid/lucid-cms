import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { RequestSummary, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		type?: Accessor<string | undefined>;
		status?: Accessor<string | undefined>;
		approval?: Accessor<string | undefined>;
		failed?: Accessor<string | undefined>;
		assignedToMe?: Accessor<string | undefined>;
		involvesMe?: Accessor<string | undefined>;
		createdBy?: Accessor<number | undefined>;
		collectionKey?: Accessor<string | undefined>;
		documentId?: Accessor<number | undefined>;
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
	return useQuery(() => ({
		queryKey: [...queryKeys.requests.list(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<RequestSummary[]>>({
				url: "/lucid/api/v1/requests",
				query: queryParams(),
				method: "GET",
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

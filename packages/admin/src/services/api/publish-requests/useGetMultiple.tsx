import { useQuery } from "@tanstack/solid-query";
import type {
	PublishOperation,
	PublishOperationStatus,
	ResponseBody,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		status?: Accessor<PublishOperationStatus | undefined>;
		collectionKey?: Accessor<string | undefined>;
		documentId?: Accessor<number | undefined>;
		target?: Accessor<string | undefined>;
		assignedToMe?: Accessor<string | undefined>;
		requestedByMe?: Accessor<string | undefined>;
	};
	perPage?: number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["publishRequests.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishOperation[]>>({
				url: "/lucid/api/v1/publish-requests",
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

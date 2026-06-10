import { useQuery } from "@tanstack/solid-query";
import type {
	PublishOperation,
	PublishOperationExecutionStatus,
	PublishOperationStatus,
	PublishOperationType,
	ResponseBody,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		status?: Accessor<
			PublishOperationStatus | PublishOperationStatus[] | undefined
		>;
		executionStatus?: Accessor<
			| PublishOperationExecutionStatus
			| PublishOperationExecutionStatus[]
			| undefined
		>;
		operationType?: Accessor<PublishOperationType | undefined>;
		collectionKey?: Accessor<string | undefined>;
		documentId?: Accessor<number | undefined>;
		target?: Accessor<string | undefined>;
		requestedBy?: Accessor<number[] | undefined>;
		reviewers?: Accessor<number[] | undefined>;
		assignedToMe?: Accessor<string | undefined>;
		requestedByMe?: Accessor<string | undefined>;
	};
	perPage?: Accessor<number> | number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: ["publishOperations.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PublishOperation[]>>({
				url: "/lucid/api/v1/publish-operations",
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

import { useQuery } from "@tanstack/solid-query";
import type { DocumentVersionResponse, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: Record<
		string,
		Accessor<string | string[] | undefined> | string | string[]
	>;
	location: {
		collectionKey: Accessor<string | undefined> | string;
		documentId: Accessor<number | undefined> | number;
	};
	perPage?: Accessor<number> | number;
}

const useGetMultipleRevisions = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["documents.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<DocumentVersionResponse[]>>({
				url: `/lucid/api/v1/documents/${
					queryParams().location?.collectionKey
				}/${queryParams().location?.documentId}/revisions`,
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

export default useGetMultipleRevisions;

import { useQuery } from "@tanstack/solid-query";
import type {
	DocumentResponse,
	DocumentVersionType,
	ResponseBody,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		collectionKey?: Accessor<string | undefined> | string;
		id?: Accessor<number | undefined> | number;
		version:
			| Accessor<DocumentVersionType | undefined | number>
			| DocumentVersionType
			| number;
	};
	include: {
		bricks: Accessor<boolean | undefined> | boolean;
	};
}

const useGetSingle = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() => {
		return serviceHelpers.getQueryParams<QueryParams>(params.queryParams);
	});
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["documents.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<DocumentResponse>>({
				url: `/lucid/api/v1/documents/${
					queryParams().location?.collectionKey
				}/${queryParams().location?.id}/${queryParams().location?.version}`,
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetSingle;

import { createMemo, type Accessor } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type {
	ResponseBody,
	CollectionDocumentResponse,
} from "@lucidcms/core/types";

interface QueryParams {
	location: {
		collectionKey?: Accessor<string | undefined> | string;
		id?: Accessor<number | undefined> | number;
		versionId?: Accessor<number | undefined> | number;
	};
	include: {
		bricks: Accessor<boolean | undefined> | boolean;
	};
}

const useGetSingleVersion = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() => {
		return serviceHelpers.getQueryParams<QueryParams>(params.queryParams);
	});
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return createQuery(() => ({
		queryKey: ["collections.document.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<CollectionDocumentResponse>>({
				url: `/api/v1/collections/documents/${
					queryParams().location?.collectionKey
				}/${queryParams().location?.id}/${queryParams().location?.versionId}`,
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

export default useGetSingleVersion;

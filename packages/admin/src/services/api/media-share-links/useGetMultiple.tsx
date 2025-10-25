import { createQuery } from "@tanstack/solid-query";
import type { MediaShareLinkResponse, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	location: {
		mediaId: Accessor<number | undefined> | number;
	};
	filters?: {
		name?: Accessor<string>;
		token?: Accessor<string>;
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
	return createQuery(() => ({
		queryKey: ["mediaShareLinks.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<MediaShareLinkResponse[]>>({
				url: `/api/v1/media/${queryParams().location?.mediaId}/share-links`,
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

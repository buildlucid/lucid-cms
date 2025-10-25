import { createQuery } from "@tanstack/solid-query";
import type { MediaShareLinkResponse, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		mediaId: Accessor<number | undefined> | number;
		id: Accessor<number | undefined> | number;
	};
}

const useGetSingle = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return createQuery(() => ({
		queryKey: ["mediaShareLinks.getSingle", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<MediaShareLinkResponse>>({
				url: `/api/v1/media/${queryParams().location?.mediaId}/share-links/${queryParams().location?.id}`,
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetSingle;

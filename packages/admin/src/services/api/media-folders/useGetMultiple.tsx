import { type Accessor, createMemo } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, MultipleMediaFolderResponse } from "@types";

interface QueryParams {
	filters?: {
		parentFolderId?: Accessor<number | string | undefined>;
		title?: Accessor<string>;
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
		queryKey: ["mediaFolders.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<MultipleMediaFolderResponse>>({
				url: "/api/v1/media/folders",
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

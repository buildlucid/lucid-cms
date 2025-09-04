import { type Accessor, createMemo } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, MediaFolderResponse } from "@types";

interface QueryParams {
	filters?: {
		parentFolderId?: Accessor<number | null | string>;
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
		queryKey: ["media-folders.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<MediaFolderResponse[]>>({
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

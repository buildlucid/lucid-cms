import { createQuery } from "@tanstack/solid-query";
import type { MediaResponse, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		name?: Accessor<string>;
		key?: Accessor<string>;
		mimeType?: Accessor<string>;
		extension?: Accessor<string>;
		type?: Accessor<string | string[]>;
		folderId?: Accessor<number | string | undefined>;
		isDeleted?: Accessor<1 | 0> | 0 | 1;
		public?: Accessor<1 | 0> | 0 | 1;
	};
	perPage?: number;
	headers: {
		"lucid-content-locale": Accessor<string | undefined> | string;
	};
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return createQuery(() => ({
		queryKey: ["media.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<MediaResponse[]>>({
				url: "/api/v1/media",
				query: queryParams(),
				config: {
					method: "GET",
					headers: queryParams().headers,
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

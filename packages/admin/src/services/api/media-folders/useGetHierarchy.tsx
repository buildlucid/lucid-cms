import { useQuery } from "@tanstack/solid-query";
import type { MediaFolderResponse, ResponseBody } from "@types";
import { createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetHierarchy = (params?: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams || {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["mediaFolders.getHierarchy", queryKey(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<MediaFolderResponse[]>>({
				url: "/lucid/api/v1/media/folders/hierarchy",
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetHierarchy;

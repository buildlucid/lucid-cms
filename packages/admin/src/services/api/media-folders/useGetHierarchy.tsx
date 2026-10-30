import { useQuery } from "@tanstack/solid-query";
import type { MediaFolder, ResponseBody } from "@types";
import { createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// oxlint-disable-next-line typescript/no-empty-object-type
interface QueryParams {}

const useGetHierarchy = (params?: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params?.queryParams || {}),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [
			...queryKeys.mediaFolders.hierarchy(),
			queryKey(),
			params?.key?.(),
		],
		queryFn: () =>
			request<ResponseBody<MediaFolder[]>>({
				url: "/api/v1/media/folders/hierarchy",
				query: queryParams(),
				method: "GET",
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetHierarchy;

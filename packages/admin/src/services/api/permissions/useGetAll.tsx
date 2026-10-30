import { useQuery } from "@tanstack/solid-query";
import type { PermissionGroup, ResponseBody } from "@types";
import { createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// oxlint-disable-next-line typescript/no-empty-object-type
interface QueryParams {}

const useGetAll = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.permissions.list(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<PermissionGroup[]>>({
				url: "/api/v1/permissions",
				query: queryParams(),
				method: "GET",
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetAll;

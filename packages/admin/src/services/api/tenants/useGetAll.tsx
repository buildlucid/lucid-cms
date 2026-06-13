import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, Tenant } from "@types";
import { createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

// biome-ignore lint/suspicious/noEmptyInterface: explanation
interface QueryParams {}

const useGetAll = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	const query = useQuery(() => ({
		queryKey: ["tenants.getAll", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<Tenant[]>>({
				url: "/lucid/api/v1/tenants",
				config: {
					method: "GET",
					tenant: false,
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

	return query;
};

export default useGetAll;

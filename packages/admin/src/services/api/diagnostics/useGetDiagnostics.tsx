import { useQuery } from "@tanstack/solid-query";
import type { Diagnostics, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

const useGetDiagnostics = (params?: QueryHook<Record<string, never>>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.diagnostics.detail(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<Diagnostics>>({
				url: "/api/v1/diagnostics",
				method: "GET",
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetDiagnostics;

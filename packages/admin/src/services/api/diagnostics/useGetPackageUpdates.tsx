import { useQuery } from "@tanstack/solid-query";
import type { DiagnosticPackageUpdate, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

//* npm's answer is cached on the server too, so the sidebar and diagnostics page share one request an hour
const STALE_TIME = 60 * 60 * 1000;

const useGetPackageUpdates = (params?: QueryHook<Record<string, never>>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.diagnostics.updates(), params?.key?.()],
		queryFn: () =>
			request<ResponseBody<DiagnosticPackageUpdate[]>>({
				url: "/api/v1/diagnostics/updates",
				method: "GET",
			}),
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetPackageUpdates;

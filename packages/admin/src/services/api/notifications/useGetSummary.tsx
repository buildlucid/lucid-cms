import { useQuery } from "@tanstack/solid-query";
import type { NotificationSummary, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** Unread and to-do counts, polled every minute while the tab is visible. */
const useGetSummary = (params?: { enabled?: () => boolean }) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.notifications.summary(),
		queryFn: ({ signal }) =>
			request<ResponseBody<NotificationSummary>>({
				url: "/lucid/api/v1/notifications/summary",
				signal,
				displayErrorToast: false,
				method: "GET",
			}),
		refetchInterval: 60_000,
		refetchIntervalInBackground: false,
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetSummary;

import { useQuery } from "@tanstack/solid-query";
import type { NotificationPreference, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetPreferences = (params?: { enabled?: () => boolean }) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.notifications.preferences(),
		queryFn: () =>
			request<ResponseBody<NotificationPreference[]>>({
				url: "/lucid/api/v1/notifications/preferences",
				method: "GET",
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetPreferences;

import { useQuery } from "@tanstack/solid-query";
import type { NotificationType, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const useGetTypes = (params?: { enabled?: () => boolean }) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.notifications.types(),
		queryFn: () =>
			request<ResponseBody<NotificationType[]>>({
				url: "/lucid/api/v1/notifications/types",
				method: "GET",
			}),
		get enabled() {
			return params?.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetTypes;

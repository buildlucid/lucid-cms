import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { Notification, NotificationStatus, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		status?: Accessor<NotificationStatus | undefined>;
		category?: Accessor<string | undefined>;
		type?: Accessor<string | undefined>;
	};
	perPage?: Accessor<number> | number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.notifications.list(), queryKey(), params.key?.()],
		queryFn: ({ signal }) =>
			request<ResponseBody<Notification[]>>({
				url: "/lucid/api/v1/notifications",
				signal,
				displayErrorToast: false,
				//* a query string brings its own sort
				query: queryParams().queryString
					? queryParams()
					: { ...queryParams(), sort: { updatedAt: "desc" } },
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

import { useQuery } from "@tanstack/solid-query";
import type { LocalesResponse, ResponseBody } from "@types";
import { type Accessor, createEffect, createMemo } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string> | string;
	perPage?: Accessor<number> | number;
}

const useGetAll = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	const query = useQuery(() => ({
		queryKey: ["locales.getAll", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<LocalesResponse[]>>({
				url: "/api/v1/locales",
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));

	// Effects
	createEffect(() => {
		if (query.isSuccess) {
			contentLocaleStore.get.syncContentLocale(query.data?.data);
			contentLocaleStore.set("locales", query.data?.data || []);
		}
	});

	return query;
};

export default useGetAll;

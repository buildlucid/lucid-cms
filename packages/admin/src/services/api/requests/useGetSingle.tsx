import { queryOptions, useQuery } from "@tanstack/solid-query";
import type { RequestDetails, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import constants from "@/constants";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

interface QueryParams {
	location: {
		id: Accessor<number | undefined>;
	};
}

export const requestQueryOptions = (id: number | undefined) =>
	queryOptions({
		queryKey: [...queryKeys.requests.detail(), id] as const,
		queryFn: () =>
			request<ResponseBody<RequestDetails>>({
				url: `/api/v1/requests/${id}`,
				method: "GET",
			}),
		enabled: id !== undefined,
		staleTime: constants.preloadStaleTime,
	});

const useGetSingle = (params: QueryHook<QueryParams>) =>
	useQuery(() => {
		const options = requestQueryOptions(params.queryParams.location.id());
		return {
			...options,
			enabled: options.enabled && (params.enabled ? params.enabled() : true),
		};
	});

export default useGetSingle;

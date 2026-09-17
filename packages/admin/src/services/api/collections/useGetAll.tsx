import { useQuery } from "@tanstack/solid-query";
import type { Collection, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import request, { type RequestParams } from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string> | string;
	include?: {
		bricks?: Accessor<boolean | undefined> | boolean;
		fields?: Accessor<boolean | undefined> | boolean;
	};
}

export const getAllReq = (
	options: Pick<RequestParams, "signal" | "displayErrorToast" | "query"> = {},
) =>
	request<ResponseBody<Collection[]>>({
		url: "/lucid/api/v1/collections",
		...options,
	});

const useGetAll = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() => {
		const paramsValue = serviceHelpers.getQueryParams<QueryParams>(
			params.queryParams,
		);
		return {
			queryString: paramsValue.queryString,
			filters: paramsValue.filters,
			include: paramsValue.include,
			exclude: paramsValue.exclude,
			perPage: paramsValue.perPage,
		};
	});

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.collections.list(
			queryParams(),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getAllReq({ query: queryParams(), signal, displayErrorToast: false }),
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetAll;

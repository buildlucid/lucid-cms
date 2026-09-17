import { useQuery } from "@tanstack/solid-query";
import type { Collection, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import helpers from "@/utils/helpers";
import request, { type RequestParams } from "@/utils/request";

interface QueryParams {
	location: {
		collectionKey: Accessor<string | undefined> | string;
	};
}

export const getSingleReq = ({
	collectionKey,
	...options
}: Pick<RequestParams, "signal" | "displayErrorToast"> & {
	collectionKey: string | undefined;
}) =>
	request<ResponseBody<Collection>>({
		url: `/lucid/api/v1/collections/${encodeURIComponent(String(collectionKey))}`,
		...options,
	});

const useGetSingle = (params: QueryHook<QueryParams>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.collections.detail(
			helpers.resolveValue(params.queryParams.location.collectionKey),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getSingleReq({
				collectionKey: helpers.resolveValue(
					params.queryParams.location.collectionKey,
				),
				signal,
				displayErrorToast: false,
			}),
		enabled:
			helpers.resolveValue(params.queryParams.location.collectionKey) !==
			undefined,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetSingle;

import { useQuery } from "@tanstack/solid-query";
import type { Media, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import helpers from "@/utils/helpers";
import request, { type RequestParams } from "@/utils/request";

interface QueryParams {
	location: {
		id: Accessor<number | undefined>;
	};
}

export const getSingleReq = ({
	id,
	...options
}: Pick<RequestParams, "signal" | "displayErrorToast"> & {
	id: number | undefined;
}) =>
	request<ResponseBody<Media>>({
		url: `/lucid/api/v1/media/${id}`,
		...options,
	});

const useGetSingle = (params: QueryHook<QueryParams>) => {
	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: queryKeys.media.detail(
			helpers.resolveValue(params.queryParams.location.id),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getSingleReq({
				id: helpers.resolveValue(params.queryParams.location.id),
				signal,
				displayErrorToast: false,
			}),
		enabled: helpers.resolveValue(params.queryParams.location.id) !== undefined,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetSingle;

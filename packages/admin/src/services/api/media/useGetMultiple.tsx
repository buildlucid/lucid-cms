import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { Media, MediaStatus, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import request, { type RequestParams } from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		name?: Accessor<string>;
		key?: Accessor<string>;
		status?: Accessor<MediaStatus | MediaStatus[]> | MediaStatus;
		mimeType?: Accessor<string>;
		extension?: Accessor<string>;
		type?: Accessor<string | string[]>;
		folderId?: Accessor<number | string | undefined>;
		isDeleted?: Accessor<1 | 0> | 0 | 1;
		public?: Accessor<1 | 0> | 0 | 1;
	};
	perPage?: number;
}

export const getMultipleReq = (
	options: Pick<RequestParams, "signal" | "displayErrorToast" | "query"> = {},
) =>
	request<ResponseBody<Media[]>>({
		url: "/lucid/api/v1/media",
		...options,
	});

const useGetMultiple = (params: QueryHook<QueryParams>) => {
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
		queryKey: queryKeys.media.list(queryParams(), getRequestInterfaceLocale()),
		queryFn: ({ signal }) =>
			getMultipleReq({
				query: queryParams(),
				signal,
				displayErrorToast: false,
			}),
		placeholderData: keepPreviousData,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetMultiple;

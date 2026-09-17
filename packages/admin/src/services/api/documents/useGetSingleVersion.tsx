import { useQuery } from "@tanstack/solid-query";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import helpers from "@/utils/helpers";
import serviceHelpers from "@/utils/service-helpers";
import { getSingleReq } from "./useGetSingle";

interface QueryParams {
	location: {
		collectionKey?: Accessor<string | undefined> | string;
		id?: Accessor<number | undefined> | number;
		versionId?: Accessor<number | undefined> | number;
	};
	include: {
		bricks: Accessor<boolean | undefined> | boolean;
		refs?: Accessor<boolean | undefined> | boolean;
	};
}

const useGetSingleVersion = (params: QueryHook<QueryParams>) => {
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
		queryKey: queryKeys.documents.detail(
			helpers.resolveValue(params.queryParams.location.collectionKey),
			helpers.resolveValue(params.queryParams.location.id),
			helpers.resolveValue(params.queryParams.location.versionId),
			queryParams(),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getSingleReq({
				collectionKey: helpers.resolveValue(
					params.queryParams.location.collectionKey,
				),
				documentId: helpers.resolveValue(params.queryParams.location.id),
				version: helpers.resolveValue(params.queryParams.location.versionId),
				query: queryParams(),
				signal,
				displayErrorToast: false,
			}),
		enabled:
			helpers.resolveValue(params.queryParams.location.collectionKey) !==
				undefined &&
			helpers.resolveValue(params.queryParams.location.id) !== undefined &&
			helpers.resolveValue(params.queryParams.location.versionId) !== undefined,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetSingleVersion;

import { useQuery } from "@tanstack/solid-query";
import type { DocumentVersion, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import helpers from "@/utils/helpers";
import request, { type RequestParams } from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: Record<
		string,
		Accessor<string | string[] | undefined> | string | string[]
	>;
	location: {
		collectionKey: Accessor<string | undefined> | string;
		documentId: Accessor<number | undefined> | number;
	};
	perPage?: Accessor<number> | number;
}

export const getMultipleRevisionsReq = ({
	collectionKey,
	documentId,
	...options
}: Pick<RequestParams, "signal" | "displayErrorToast" | "query"> & {
	collectionKey: string | undefined;
	documentId: number | undefined;
}) =>
	request<ResponseBody<DocumentVersion[]>>({
		url: `/lucid/api/v1/documents/${encodeURIComponent(String(collectionKey))}/${documentId}/revisions`,
		...options,
	});

const useGetMultipleRevisions = (params: QueryHook<QueryParams>) => {
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
		queryKey: queryKeys.documents.revisions(
			helpers.resolveValue(params.queryParams.location.collectionKey),
			helpers.resolveValue(params.queryParams.location.documentId),
			queryParams(),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getMultipleRevisionsReq({
				collectionKey: helpers.resolveValue(
					params.queryParams.location.collectionKey,
				),
				documentId: helpers.resolveValue(
					params.queryParams.location.documentId,
				),
				query: queryParams(),
				signal,
				displayErrorToast: false,
			}),
		enabled:
			helpers.resolveValue(params.queryParams.location.collectionKey) !==
				undefined &&
			helpers.resolveValue(params.queryParams.location.documentId) !==
				undefined,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetMultipleRevisions;

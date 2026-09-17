import { useQuery } from "@tanstack/solid-query";
import type {
	DocumentVersionType,
	InternalCollectionDocument,
	RefResource,
	Refs,
	ResponseBody,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import { getRequestInterfaceLocale } from "@/translations";
import type { QueryHook } from "@/types/utils";
import helpers from "@/utils/helpers";
import request, { type RequestParams } from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type DocumentRefInclude = "refs" | `refs.${RefResource}`;
type DocumentInclude = "bricks" | DocumentRefInclude;

interface QueryParams {
	location: {
		collectionKey?: Accessor<string | undefined> | string;
		id?: Accessor<number | undefined> | number;
		version:
			| Accessor<DocumentVersionType | undefined | number>
			| DocumentVersionType
			| number;
	};
	include: Partial<
		Record<DocumentInclude, Accessor<boolean | undefined> | boolean>
	>;
}

export const getSingleReq = ({
	collectionKey,
	documentId,
	version,
	...options
}: Pick<RequestParams, "signal" | "displayErrorToast" | "query"> & {
	collectionKey: string | undefined;
	documentId: number | undefined;
	version: string | number | undefined;
}) =>
	request<ResponseBody<InternalCollectionDocument, Refs>>({
		url: `/lucid/api/v1/documents/${encodeURIComponent(String(collectionKey))}/${documentId}/${encodeURIComponent(String(version))}`,
		...options,
	});

const useGetSingle = (params: QueryHook<QueryParams>) => {
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
			helpers.resolveValue(params.queryParams.location.version),
			queryParams(),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getSingleReq({
				collectionKey: helpers.resolveValue(
					params.queryParams.location.collectionKey,
				),
				documentId: helpers.resolveValue(params.queryParams.location.id),
				version: helpers.resolveValue(params.queryParams.location.version),
				query: queryParams(),
				signal,
				displayErrorToast: false,
			}),
		enabled:
			helpers.resolveValue(params.queryParams.location.collectionKey) !==
				undefined &&
			helpers.resolveValue(params.queryParams.location.id) !== undefined &&
			helpers.resolveValue(params.queryParams.location.version) !== undefined,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetSingle;

import { keepPreviousData, useQuery } from "@tanstack/solid-query";
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

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: Record<
		string,
		| Accessor<string | string[] | undefined | number>
		| number
		| string
		| string[]
	>;
	location: {
		collectionKey: Accessor<string | undefined> | string;
		versionType:
			| Accessor<Exclude<DocumentVersionType, "revision">>
			| Exclude<DocumentVersionType, "revision">;
	};
	include?: Partial<
		Record<DocumentRefInclude, Accessor<boolean | undefined> | boolean>
	>;
	perPage?: Accessor<number> | number;
}

export const getMultipleReq = ({
	collectionKey,
	versionType,
	...options
}: Pick<RequestParams, "signal" | "displayErrorToast" | "query"> & {
	collectionKey: string | undefined;
	versionType: string;
}) =>
	request<ResponseBody<InternalCollectionDocument[], Refs>>({
		url: `/lucid/api/v1/documents/${encodeURIComponent(String(collectionKey))}/${encodeURIComponent(versionType)}`,
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
		queryKey: queryKeys.documents.list(
			helpers.resolveValue(params.queryParams.location.collectionKey),
			helpers.resolveValue(params.queryParams.location.versionType),
			queryParams(),
			getRequestInterfaceLocale(),
		),
		queryFn: ({ signal }) =>
			getMultipleReq({
				collectionKey: helpers.resolveValue(
					params.queryParams.location.collectionKey,
				),
				versionType: helpers.resolveValue(
					params.queryParams.location.versionType,
				),
				query: queryParams(),
				signal,
				displayErrorToast: false,
			}),
		placeholderData: keepPreviousData,
		enabled:
			helpers.resolveValue(params.queryParams.location.collectionKey) !==
				undefined &&
			helpers.resolveValue(params.queryParams.location.versionType) !==
				undefined,
		...(params.enabled ? { enabled: params.enabled() } : {}),
		refetchOnWindowFocus: params.refetchOnWindowFocus,
	}));
};

export default useGetMultiple;

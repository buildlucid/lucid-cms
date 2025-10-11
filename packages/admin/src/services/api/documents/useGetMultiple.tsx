import { createMemo, type Accessor } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type {
	ResponseBody,
	DocumentResponse,
	DocumentVersionType,
} from "@types";

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
	perPage?: Accessor<number> | number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return createQuery(() => ({
		queryKey: ["documents.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<DocumentResponse[]>>({
				url: `/api/v1/documents/${
					queryParams().location?.collectionKey
				}/${queryParams().location?.versionType}`,
				query: queryParams(),
				config: {
					method: "GET",
				},
			}),
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetMultiple;

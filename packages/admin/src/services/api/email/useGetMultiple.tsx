import { useQuery } from "@tanstack/solid-query";
import type { EmailResponse, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	filters?: {
		toAddress?: Accessor<number>;
		subject?: Accessor<string>;
		currentStatus?: Accessor<string[]>;
		type?: Accessor<string[]>;
		template?: Accessor<string>;
	};
	perPage?: number;
}

const useGetMultiple = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: ["email.getMultiple", queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<EmailResponse[]>>({
				url: "/api/v1/emails",
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

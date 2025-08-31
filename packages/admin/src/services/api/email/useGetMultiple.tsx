import { createMemo, type Accessor } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody, EmailResponse } from "@types";

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
	return createQuery(() => ({
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

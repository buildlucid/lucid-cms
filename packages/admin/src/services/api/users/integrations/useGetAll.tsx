import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { Integration, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	perPage?: number;
}

const bindUseGetAll =
	(userId: Accessor<number>) => (params: QueryHook<QueryParams>) => {
		const queryParams = createMemo(() =>
			serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
		);
		const queryKey = createMemo(() =>
			serviceHelpers.getQueryKey(queryParams()),
		);

		// -----------------------------
		// Query
		return useQuery(() => ({
			queryKey: [
				"integrations.getAll",
				"user",
				userId(),
				queryKey(),
				params.key?.(),
			],
			queryFn: () =>
				request<ResponseBody<Integration[]>>({
					url: `/lucid/api/v1/users/${userId()}/integrations`,
					query: queryParams(),
					config: {
						method: "GET",
					},
				}),
			placeholderData: keepPreviousData,
			get enabled() {
				return params.enabled ? params.enabled() : true;
			},
		}));
	};

export default bindUseGetAll;

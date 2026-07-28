import { useQuery } from "@tanstack/solid-query";
import type { Integration, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	location: {
		id: Accessor<number | undefined>;
	};
}

const bindUseGetSingle =
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
				"integrations.getSingle",
				"user",
				userId(),
				queryKey(),
				params.key?.(),
			],
			queryFn: () =>
				request<ResponseBody<Integration>>({
					url: `/lucid/api/v1/users/${userId()}/integrations/${queryParams().location?.id}`,
					config: {
						method: "GET",
					},
				}),
			get enabled() {
				return params.enabled ? params.enabled() : true;
			},
		}));
	};

export default bindUseGetSingle;

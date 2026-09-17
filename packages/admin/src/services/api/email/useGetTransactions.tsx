import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { EmailTransaction, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	queryString?: Accessor<string>;
	location: {
		emailId: Accessor<number | undefined>;
	};
}

const useGetTransactions = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	return useQuery(() => ({
		queryKey: [...queryKeys.email.transactions(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<EmailTransaction[]>>({
				url: `/lucid/api/v1/emails/${queryParams().location?.emailId}/transactions`,
				query: queryParams(),
				method: "GET",
			}),
		placeholderData: keepPreviousData,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetTransactions;

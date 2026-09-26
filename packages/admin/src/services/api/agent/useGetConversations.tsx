import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AgentConversation, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import { isRunWorking } from "@/utils/agent-chat";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	/** Filters, sorts and pagination from a list's query state. */
	queryString?: Accessor<string>;
	filters?: {
		title?: Accessor<string | undefined>;
		status?: Accessor<string | undefined> | string;
	};
	perPage?: Accessor<number> | number;
}

const useGetConversations = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [...queryKeys.agent.conversations(), queryKey(), params.key?.()],
		queryFn: () =>
			request<ResponseBody<AgentConversation[]>>({
				url: "/lucid/api/v1/agent/conversations",
				//* a query string brings its own sort
				query: queryParams().queryString
					? queryParams()
					: { ...queryParams(), sort: { updatedAt: "desc" } },
			}),
		placeholderData: keepPreviousData,
		refetchInterval: (query) =>
			query.state.data?.data.some((conversation) =>
				isRunWorking(conversation.latestRun?.status),
			)
				? 5000
				: false,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetConversations;

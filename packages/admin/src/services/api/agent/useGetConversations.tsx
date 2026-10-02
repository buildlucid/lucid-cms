import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type { AgentConversation, ResponseBody } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import { isRunWorking, shouldPollTitle } from "@/utils/agent-chat";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	/** Filters, sorts and pagination from a list's query state. */
	queryString?: Accessor<string>;
	filters?: {
		title?: Accessor<string | undefined>;
		status?: Accessor<string | undefined> | string;
		agentKey?: Accessor<string | undefined>;
	};
	perPage?: Accessor<number> | number;
}

const useGetConversations = (
	params: QueryHook<QueryParams> & {
		/** Keeps a visible list current even when none of its chats are working. */
		idleRefetchInterval?: number;
	},
) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [
			...queryKeys.agent.conversationLists(),
			queryKey(),
			params.key?.(),
		],
		queryFn: ({ signal }) =>
			request<ResponseBody<AgentConversation[]>>({
				url: "/lucid/api/v1/agent/conversations",
				signal,
				displayErrorToast: false,
				//* a query string brings its own sort
				query: queryParams().queryString
					? queryParams()
					: { ...queryParams(), sort: { updatedAt: "desc" } },
			}),
		placeholderData: keepPreviousData,
		refetchInterval: (query) =>
			query.state.data?.data.some(
				(conversation) =>
					isRunWorking(conversation.latestRun?.status) ||
					shouldPollTitle(conversation),
			)
				? 5000
				: (params.idleRefetchInterval ?? false),
		refetchIntervalInBackground: false,
		get enabled() {
			return params.enabled ? params.enabled() : true;
		},
	}));
};

export default useGetConversations;

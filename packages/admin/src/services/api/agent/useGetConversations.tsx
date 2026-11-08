import { keepPreviousData, useQuery } from "@tanstack/solid-query";
import type {
	AgentConversation,
	AgentRunWaitingFor,
	ResponseBody,
} from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import { isRunBusy } from "@/utils/agent-chat";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface QueryParams {
	/** Filters, sorts and pagination from a list's query state. */
	queryString?: Accessor<string>;
	filters?: {
		title?: Accessor<string | undefined>;
		status?: Accessor<string | undefined> | string;
		/** Narrows waiting chats to those waiting on a person, or on sub-agents. */
		waitingFor?: AgentRunWaitingFor;
		agentKey?: Accessor<string | string[] | undefined>;
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
				url: "/api/v1/agent/conversations",
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
					isRunBusy(conversation.latestRun) ||
					conversation.titleStatus === "generating",
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

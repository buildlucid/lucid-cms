import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, UserDisplay } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

/** Searches the people who can see a request, and so can be mentioned in its comments. */
export const getMentionableUsersReq = (params: {
	id: number;
	/** Matches full names or usernames. */
	name?: string;
	limit?: number;
}) =>
	request<ResponseBody<UserDisplay[]>>({
		url: `/api/v1/requests/${params.id}/mentionable-users`,
		query: {
			filters: { name: params.name || undefined },
			queryString:
				params.limit === undefined ? undefined : `limit=${params.limit}`,
		},
		method: "GET",
	});

interface QueryParams {
	location: {
		id: Accessor<number | undefined>;
	};
	filters: {
		id: Accessor<number[] | undefined>;
	};
}

/** Looks up mentionable people by ID, such as a mention being hovered. */
const useGetMentionableUsers = (params: QueryHook<QueryParams>) => {
	const queryParams = createMemo(() =>
		serviceHelpers.getQueryParams<QueryParams>(params.queryParams),
	);
	const queryKey = createMemo(() => serviceHelpers.getQueryKey(queryParams()));

	// -----------------------------
	// Query
	return useQuery(() => ({
		queryKey: [
			...queryKeys.requests.mentionableUsers(),
			queryKey(),
			params.key?.(),
		],
		queryFn: () =>
			request<ResponseBody<UserDisplay[]>>({
				url: `/api/v1/requests/${queryParams().location?.id}/mentionable-users`,
				query: { filters: queryParams().filters },
				method: "GET",
			}),
		get enabled() {
			return (
				params.queryParams.location.id() !== undefined &&
				(params.enabled ? params.enabled() : true)
			);
		},
	}));
};

export default useGetMentionableUsers;

import {
	type InfiniteData,
	useInfiniteQuery,
	useQueryClient,
} from "@tanstack/solid-query";
import type { AgentMessage, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

const pageSize = 50;
type MessagePages = InfiniteData<
	ResponseBody<AgentMessage[]>,
	number | undefined
>;

/** Loads the latest messages first. A run refreshes that page while keeping earlier pages in the cache. */
const useGetMessages = (params: { id: Accessor<string | undefined> }) => {
	const queryClient = useQueryClient();

	const getPage = (
		id: string | undefined,
		before?: number,
		signal?: AbortSignal,
	) =>
		request<ResponseBody<AgentMessage[]>>({
			url: `/lucid/api/v1/agent/conversations/${id}/messages?${new URLSearchParams(
				{
					limit: String(pageSize),
					...(before ? { before: String(before) } : {}),
				},
			)}`,
			signal,
		});

	// -----------------------------
	// Query
	const query = useInfiniteQuery(() => ({
		queryKey: queryKeys.agent.messages(params.id()),
		queryFn: ({ pageParam, signal }) => getPage(params.id(), pageParam, signal),
		initialPageParam: undefined as number | undefined,
		getNextPageParam: (page) =>
			page.data.length >= pageSize ? page.data[0]?.position : undefined,
		enabled: params.id() !== undefined,
	}));

	// -----------------------------
	// Refresh
	/** Saves the streamed rows before fetching, so replies longer than one page cannot leave gaps. */
	const refreshLatest = async (streamed?: AgentMessage[]) => {
		const id = params.id();
		if (!id) return;

		const key = queryKeys.agent.messages(id);

		if (streamed) {
			queryClient.setQueryData<MessagePages>(key, (current) => {
				if (!current) return current;

				const first = current.pages[0];
				const position = first.data[0]?.position ?? 0;

				return {
					...current,
					pages: [
						{
							...first,
							data: streamed.filter((row) => row.position >= position),
						},
						...current.pages.slice(1),
					],
				};
			});
		}

		const latest = await getPage(id);
		let rows = latest.data;
		const previous = queryClient
			.getQueryData<MessagePages>(key)
			?.pages[0].data.at(-1)?.position;

		//* a background run may have added more than a page while the chat was closed
		let first = rows[0]?.position;
		while (
			previous !== undefined &&
			first !== undefined &&
			first > previous + 1
		) {
			const earlier = await getPage(id, first);
			if (!earlier.data.length) break;

			rows = [...earlier.data, ...rows];
			first = earlier.data[0].position;
		}

		queryClient.setQueryData<MessagePages>(key, (current) => {
			const page = { ...latest, data: rows };
			if (!current) return { pages: [page], pageParams: [undefined] };

			const earlier =
				first === undefined
					? []
					: current.pages[0].data.filter((row) => row.position < first);

			return {
				...current,
				pages: [
					{ ...page, data: [...earlier, ...rows] },
					...current.pages.slice(1),
				],
			};
		});
	};

	return { query, refreshLatest };
};

export default useGetMessages;

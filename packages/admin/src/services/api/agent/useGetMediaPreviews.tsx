import { useQuery } from "@tanstack/solid-query";
import type { Media, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** Current details for the chat's linked media, resolved with the viewer's access. Every gallery in the chat shares it. */
const useGetMediaPreviews = (params: { id: Accessor<string> }) =>
	useQuery(() => ({
		queryKey: queryKeys.agent.mediaPreviews(params.id()),
		queryFn: ({ signal }) =>
			request<ResponseBody<Media[]>>({
				url: `/lucid/api/v1/agent/conversations/${params.id()}/media-previews`,
				signal,
				displayErrorToast: false,
			}),
		retry: false,
	}));

export default useGetMediaPreviews;

import { useQuery } from "@tanstack/solid-query";
import type {
	MediaGenerationType,
	MediaModelCatalog,
	ResponseBody,
} from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** Gets the models people can pick to generate a media type, narrowed by the CMS config. */
const useGetMediaModels = <Type extends MediaGenerationType>(params: {
	type: Accessor<Type>;
	enabled?: Accessor<boolean>;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.ai.mediaModels(params.type()),
		queryFn: () =>
			request<ResponseBody<MediaModelCatalog<Type>>>({
				url: `/lucid/api/v1/ai/models/${params.type()}`,
			}),
		enabled: params.enabled?.() ?? true,
		staleTime: 60_000,
	}));

export default useGetMediaModels;

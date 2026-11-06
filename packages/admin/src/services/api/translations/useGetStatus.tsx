import { useQuery } from "@tanstack/solid-query";
import type { DocumentTranslationStatus, ResponseBody } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** How documents' latest translations compare with their default locale. */
const useGetStatus = (params: {
	collectionKey: Accessor<string | undefined>;
	documentIds: Accessor<number[]>;
	enabled?: Accessor<boolean>;
}) =>
	useQuery(() => ({
		queryKey: queryKeys.translations.status(
			params.collectionKey(),
			params.documentIds(),
		),
		queryFn: () =>
			request<ResponseBody<DocumentTranslationStatus[]>>({
				url: `/api/v1/documents/${params.collectionKey()}/translate/status`,
				csrf: true,
				method: "POST",
				body: { documentIds: params.documentIds() },
			}),
		enabled:
			(params.enabled?.() ?? true) &&
			params.collectionKey() !== undefined &&
			params.documentIds().length > 0,
	}));

export default useGetStatus;

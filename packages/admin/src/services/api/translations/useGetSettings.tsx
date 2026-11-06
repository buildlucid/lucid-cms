import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, TranslationSettings } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";

/** The glossary and style notes every translation follows. */
const useGetSettings = (params?: { enabled?: Accessor<boolean> }) =>
	useQuery(() => ({
		queryKey: queryKeys.translations.settings(),
		queryFn: () =>
			request<ResponseBody<TranslationSettings>>({
				url: "/api/v1/translations/settings",
				method: "GET",
			}),
		enabled: params?.enabled?.() ?? true,
	}));

export default useGetSettings;

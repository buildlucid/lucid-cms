import { useQuery } from "@tanstack/solid-query";
import type { ResponseBody, TransferFile } from "@types";
import type { Accessor } from "solid-js";
import { queryKeys } from "@/services/query-keys";
import type { QueryHook } from "@/types/utils";
import request from "@/utils/request";

interface Params {
	body: {
		select: Record<string, unknown>;
		/** Also export documents the selection links to, one level deep. */
		linked?: boolean;
	};
}

export const exportReq = (params: Params & { signal?: AbortSignal }) =>
	request<ResponseBody<TransferFile>>({
		url: "/api/v1/transfer/export",
		csrf: true,
		method: "POST",
		body: params.body,
		signal: params.signal,
	});

interface QueryParams {
	select: Accessor<Record<string, unknown> | undefined>;
	linked: Accessor<boolean>;
}

/** Builds the export file for a selection, so it can be summarised before it's downloaded. */
const useExport = (params: QueryHook<QueryParams>) =>
	useQuery(() => {
		const select = params.queryParams.select();
		const linked = params.queryParams.linked();
		return {
			queryKey: queryKeys.transfer.export(select, linked),
			queryFn: ({ signal }) =>
				exportReq({ body: { select: select ?? {}, linked }, signal }),
			enabled: select !== undefined && (params.enabled?.() ?? true),
			refetchOnWindowFocus: false,
			//* each export is built fresh when the modal opens
			gcTime: 0,
			//* changing options keeps the last export on screen, but a new selection starts empty
			placeholderData: (previous, previousQuery) =>
				JSON.stringify(previousQuery?.queryKey[3]) === JSON.stringify(select)
					? previous
					: undefined,
		};
	});

export default useExport;

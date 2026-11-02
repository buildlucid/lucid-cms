import type {
	ResponseBody,
	TransferEntry,
	TransferFile,
	TransferImportCheck,
	TransferImportMode,
	TransferItemResult,
} from "@types";
import request from "@/utils/request";

/** Plans an import without saving anything, returning entries in the order to import them. */
export const checkImportReq = (params: {
	body: {
		/** The export file without its bundled files. */
		file: TransferFile;
		mode: TransferImportMode;
	};
	signal?: AbortSignal;
}) =>
	request<ResponseBody<TransferImportCheck>>({
		url: "/api/v1/transfer/import/check",
		csrf: true,
		method: "POST",
		body: params.body,
		signal: params.signal,
		displayErrorToast: false,
	});

/** Imports one entry. A failed entry comes back as its result rather than an error. */
export const importEntryReq = (params: {
	body: {
		source: Pick<TransferFile["source"], "instanceId">;
		resource: string;
		entry: TransferEntry;
		mode: TransferImportMode;
		/** Entries still to import that this entry links to. */
		pending: Array<{ resource: string; uid: string }>;
		/** The last attempt, so links that can't be made are reported instead of held back. */
		final?: boolean;
		/** The entry's bundled file, already uploaded through an upload session. */
		upload?: { key: string };
	};
}) =>
	request<ResponseBody<TransferItemResult>>({
		url: "/api/v1/transfer/import",
		csrf: true,
		method: "POST",
		body: params.body,
		displayErrorToast: false,
	});

import type {
	InternalDocumentField,
	ResponseBody,
	TranslateDocumentsResponse,
} from "@types";
import { requestChangeKeys } from "@/services/api/requests/change-keys";
import { queryKeys } from "@/services/query-keys";
import type { BrickData } from "@/store/brickStore/brickStore";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	body: {
		documentIds: number[];
		targetLocales: string[];
		overwrite?: boolean;
		note?: string;
		delivery: "request" | "editor";
		/** The open editor's unsaved content, for editor delivery. */
		content?: {
			bricks: Array<BrickData>;
			fields: Array<InternalDocumentField>;
		};
	};
}

//* the admin translates into requests or the editor, never straight to latest
type Response = ResponseBody<
	Exclude<TranslateDocumentsResponse, { delivery: "latest" }>
>;

export const translateDocumentsReq = (params: Params) => {
	return request<Response>({
		url: `/api/v1/documents/${params.collectionKey}/translate`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

/** Translates documents into requests, or returns translations for the open editor. Callers toast the outcome. */
const useTranslateDocuments = () => {
	return serviceHelpers.useMutationWrapper<Params, Response>({
		mutationFn: translateDocumentsReq,
		invalidates: [
			queryKeys.translations.all(),
			queryKeys.ai.usage(),
			queryKeys.ai.credits(),
			...requestChangeKeys(),
		],
	});
};

export default useTranslateDocuments;

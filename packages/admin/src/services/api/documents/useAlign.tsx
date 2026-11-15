import type { ErrorResponse, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	documentId: number;
	versionId: number;
	body: {
		source: string;
		sourceContentId: string;
		destinationContentId: string;
		/** Proposes aligning latest in a new update request instead of saving it. */
		request?: { title: string };
	};
}

type Response = ResponseBody<{ requestId: number | null }>;

const useAlign = (props?: {
	onSuccess?: (response: Response) => void;
	onError?: (errors: ErrorResponse | undefined) => void;
}) =>
	serviceHelpers.useMutationWrapper<Params, Response>({
		mutationFn: (params) =>
			request<Response>({
				url: `/api/v1/documents/${encodeURIComponent(params.collectionKey)}/${params.documentId}/${params.versionId}/align`,
				method: "POST",
				csrf: true,
				body: params.body,
			}),
		getSuccessToast: (response) =>
			response.data.requestId === null
				? {
						title: T()("documents.align.success"),
						message: T()("documents.align.success.message"),
					}
				: {
						title: T()("toasts.document.propose.title"),
						message: T()("documents.align.proposed.message"),
					},
		invalidates: [queryKeys.documents.all(), queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
export default useAlign;

import type {
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import { requestChangeKeys } from "@/services/api/requests/change-keys";
import { queryKeys } from "@/services/query-keys";
import type { BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	documentId: number;
	body: {
		/** A new update request's details, or an open update request to add the changes to. */
		request: { title: string } | { id: number };
		bricks: Array<BrickData>;
		fields: Array<InternalDocumentField>;
		/** Latest's content ID when the changes were made, so the proposal never undoes edits saved since. */
		baseContentId?: string;
	};
}

type Response = ResponseBody<{
	requestId: number;
	versionId: number;
	contentId: string;
}>;

export const proposeSingleReq = (params: Params) => {
	return request<Response>({
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}/propose`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseProposeSingleProps {
	onSuccess?: (_data: Response) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
}

/** Proposes changes to a document's latest content in a new or open update request. */
const useProposeSingle = (props: UseProposeSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, Response>({
		mutationFn: proposeSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.document.propose.title"),
			message: T()("toasts.document.propose.message"),
		}),
		invalidates: [queryKeys.documents.all(), ...requestChangeKeys()],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useProposeSingle;

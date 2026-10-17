import type {
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import type { BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { tabId } from "@/utils/tab-id";

export interface Params {
	collectionKey: string;
	documentId: number;
	body: {
		bricks?: Array<BrickData>;
		fields?: Array<InternalDocumentField>;
		/** The content the edit was based on, so a save over content saved since is refused. */
		baseContentId?: string;
	};
}

export const createSingleVersionReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}`,
		csrf: true,
		method: "POST",
		//* a tab that no longer holds the document is refused, eg. once someone took over
		body: { ...params.body, editorTabId: tabId },
	});
};

interface UseCreateSingleVersionProps {
	onSuccess?: (
		_data: ResponseBody<{
			id: number;
		}>,
	) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useCreateSingleVersion = (props: UseCreateSingleVersionProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			id: number;
		}>
	>({
		mutationFn: createSingleVersionReq,
		getSuccessToast: () => {
			return {
				title: T()("toasts.common.update.title", {
					name: props.getCollectionName(),
				}),
				message: T()("toasts.common.update.message", {
					name: props.getCollectionName().toLowerCase(),
				}),
			};
		},
		invalidates: [queryKeys.documents.all(), queryKeys.requests.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingleVersion;

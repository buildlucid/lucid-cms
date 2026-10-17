import type { QueryKey } from "@tanstack/solid-query";
import type {
	DocumentVersionUpdateResponse,
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import type { BrickData } from "@/store/brickStore/brickStore";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { tabId } from "@/utils/tab-id";

export interface Params {
	collectionKey: string;
	documentId: number;
	versionId: number;
	body: {
		bricks?: Array<BrickData>;
		fields?: Array<InternalDocumentField>;
		/** The content the edit was based on, so a save over content saved since is refused. */
		baseContentId?: string;
	};
}

export const updateSingleVersionReq = (params: Params) => {
	return request<ResponseBody<DocumentVersionUpdateResponse>>({
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}/${params.versionId}`,
		csrf: true,
		method: "PATCH",
		//* a tab that no longer holds the document is refused, eg. once someone took over
		body: { ...params.body, editorTabId: tabId },
	});
};

interface UseUpdateSingleVersionProps {
	onSuccess?: (
		_data: ResponseBody<DocumentVersionUpdateResponse>,
		_params: Params,
	) => void;
	onError?: (_errors: ErrorResponse | undefined, _params: Params) => void;
	onMutate?: (_params: Params) => void;
	getCollectionName: () => string;
	invalidates?: readonly QueryKey[];
}

const useUpdateSingleVersion = (props: UseUpdateSingleVersionProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<DocumentVersionUpdateResponse>
	>({
		mutationFn: updateSingleVersionReq,
		invalidates: props.invalidates ?? [
			queryKeys.documents.all(),
			queryKeys.requests.all(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
	});
};

export default useUpdateSingleVersion;

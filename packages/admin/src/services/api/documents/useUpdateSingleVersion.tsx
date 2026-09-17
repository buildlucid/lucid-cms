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

export interface Params {
	collectionKey: string;
	documentId: number;
	versionId: number;
	body: {
		bricks?: Array<BrickData>;
		fields?: Array<InternalDocumentField>;
	};
}

export const updateSingleVersionReq = (params: Params) => {
	return request<ResponseBody<DocumentVersionUpdateResponse>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.documentId}/${params.versionId}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
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
		invalidates: props.invalidates ?? [queryKeys.documents.all()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
	});
};

export default useUpdateSingleVersion;

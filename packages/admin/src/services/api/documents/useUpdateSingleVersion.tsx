import type {
	DocumentVersionUpdateResponse,
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import type { BrickData } from "@/store/brick-store";
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
		config: {
			method: "PATCH",
			body: params.body,
		},
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
	invalidates?: string[];
}

const useUpdateSingleVersion = (props: UseUpdateSingleVersionProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<DocumentVersionUpdateResponse>
	>({
		mutationFn: updateSingleVersionReq,
		invalidates: props.invalidates ?? ["documents.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
	});
};

export default useUpdateSingleVersion;

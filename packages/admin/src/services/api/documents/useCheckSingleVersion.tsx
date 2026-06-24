import type {
	DocumentVersionCheckResponse,
	ErrorResponse,
	InternalDocumentField,
	ResponseBody,
} from "@types";
import type { BrickData } from "@/store/brickStore";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	documentId: number;
	versionId: number;
	requestCounter?: number;
	body: {
		bricks?: Array<BrickData>;
		fields?: Array<InternalDocumentField>;
	};
}

export const checkSingleVersionReq = (params: Params) => {
	return request<ResponseBody<DocumentVersionCheckResponse>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.documentId}/${params.versionId}/check`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseCheckSingleVersionProps {
	onSuccess?: (
		_data: ResponseBody<DocumentVersionCheckResponse>,
		_params: Params,
	) => void;
	onError?: (_errors: ErrorResponse | undefined, _params: Params) => void;
	onMutate?: (_params: Params) => void;
}

const useCheckSingleVersion = (props?: UseCheckSingleVersionProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<DocumentVersionCheckResponse>
	>({
		mutationFn: checkSingleVersionReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
	});
};

export default useCheckSingleVersion;

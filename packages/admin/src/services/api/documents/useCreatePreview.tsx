import type {
	DocumentVersionType,
	ErrorResponse,
	PreviewSessionURLResponse,
	ResponseBody,
} from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface CreatePreviewParams {
	collectionKey: string;
	documentId: number;
	versionType: DocumentVersionType;
	versionId?: number;
	locale?: string;
}

export const createPreviewReq = (params: CreatePreviewParams) => {
	return request<ResponseBody<PreviewSessionURLResponse>>({
		url: `/lucid/api/v1/documents/${params.collectionKey}/${params.documentId}/preview`,
		csrf: true,
		config: {
			method: "POST",
			body: {
				locale: params.locale,
				versionType: params.versionType,
				versionId: params.versionId,
			},
		},
	});
};

const useCreatePreview = (props?: {
	onError?: (_errors: ErrorResponse | undefined) => void;
}) => {
	return serviceHelpers.useMutationWrapper<
		CreatePreviewParams,
		ResponseBody<PreviewSessionURLResponse>
	>({
		mutationFn: createPreviewReq,
		onError: props?.onError,
	});
};

export default useCreatePreview;

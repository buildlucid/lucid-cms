import type { ErrorResponse, FieldResponse, ResponseBody } from "@types";
import type { BrickData } from "@/store/brickStore";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	collectionKey: string;
	documentId: number;
	versionId: number;
	body: {
		bricks?: Array<BrickData>;
		fields?: Array<FieldResponse>;
	};
}

export const updateSingleVersionReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
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
		_data: ResponseBody<{
			id: number;
		}>,
	) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	onMutate?: (_params: Params) => void;
	getCollectionName: () => string;
}

const useUpdateSingleVersion = (props: UseUpdateSingleVersionProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			id: number;
		}>
	>({
		mutationFn: updateSingleVersionReq,
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
	});
};

export default useUpdateSingleVersion;

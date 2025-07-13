import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { BrickData } from "@/store/brickStore";
import type { ResponseBody, ErrorResponse, FieldResponse } from "@types";

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
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}/${params.versionId}`,
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
		getSuccessToast: () => {
			return {
				title: T()("update_toast_title", {
					name: props.getCollectionName(),
				}),
				message: T()("update_toast_message", {
					name: props.getCollectionName().toLowerCase(),
				}),
			};
		},
		invalidates: ["documents.getMultiple", "documents.getSingle"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
		onMutate: props?.onMutate,
	});
};

export default useUpdateSingleVersion;

import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { BrickData } from "@/store/brickStore";
import type { ResponseBody, ErrorResponse, FieldResponse } from "@types";

export interface Params {
	collectionKey: string;
	documentId: number;
	body: {
		publish: boolean;
		bricks?: Array<BrickData>;
		fields?: Array<FieldResponse>;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<
		ResponseBody<{
			id: number;
		}>
	>({
		url: `/api/v1/documents/${params.collectionKey}/${params.documentId}`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: (
		_data: ResponseBody<{
			id: number;
		}>,
	) => void;
	onError?: (_errors: ErrorResponse | undefined) => void;
	getCollectionName: () => string;
}

const useUpdateSingle = (props: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{
			id: number;
		}>
	>({
		mutationFn: updateSingleReq,
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
	});
};

export default useUpdateSingle;
